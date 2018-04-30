# コールバック地獄

## この章の目標

この章では、これまでに見てきたモナド変換子やApplicative関手といった道具が、現実世界の問題解決にどのように役立つかを見ていきましょう。ここでは特に、**コールバック地獄**(callback hell)の問題を解決について見ていきます。

## プロジェクトの準備

この章のソースコードは、 `pulp run`を使ってコンパイルして実行することができます。 また、 `request`モジュールをNPMを使ってインストールする必要があります。

```text
npm install
```

## 問題

通常、JavaScriptの非同期処理コードでは、プログラムの流れを構造化するために**コールバック**(callbacks)を使用します。たとえば、ファイルからテキストを読み取るのに好ましいアプローチとしては、 `readFile`関数を使用し、コールバック、つまりテキストが利用可能になったときに呼び出される関数を渡すことです。

```javascript
function readText(onSuccess, onFailure) {
  var fs = require('fs');
  fs.readFile('file1.txt', { encoding: 'utf-8' }, function (error, data) {
    if (error) {
      onFailure(error.code);
    } else {
      onSuccess(data);
    }   
  });
}
```

しかしながら、複数の非同期操作が関与している場合には入れ子になったコールバックを生じることになり、すぐに読めないコードになってしまいます。

```javascript
function copyFile(onSuccess, onFailure) {
  var fs = require('fs');
  fs.readFile('file1.txt', { encoding: 'utf-8' }, function (error, data1) {
    if (error) {
      onFailure(error.code);
    } else {
      fs.writeFile('file2.txt', data, { encoding: 'utf-8' }, function (error) {
        if (error) {
          onFailure(error.code);
        } else {
          onSuccess();
        }
      });
    }   
  });
} 
```

この問題に対する解決策のひとつとしては、独自の関数に個々の非同期呼び出しを分割することです。

```javascript
function writeCopy(data, onSuccess, onFailure) {
  var fs = require('fs');
  fs.writeFile('file2.txt', data, { encoding: 'utf-8' }, function (error) {
    if (error) {
      onFailure(error.code);
    } else {
      onSuccess();
    }
  });
}

function copyFile(onSuccess, onFailure) {
  var fs = require('fs');
  fs.readFile('file1.txt', { encoding: 'utf-8' }, function (error, data) {
    if (error) {
      onFailure(error.code);
    } else {
      writeCopy(data, onSuccess, onFailure);
    }   
  });
} 
```

この解決策は一応は機能しますが、いくつか問題があります。

- 上で `writeCopy`へ `data`を渡したのと同じ方法で、非同期関数に関数の引数として途中の結果を渡さなければなりません。これは小さな関数についてはうまくいきますが、多くのコールバック関係する場合はデータの依存関係は複雑になることがあり、関数の引数が大量に追加される結果になります。
- どんな非同期関数でもコールバック `onSuccess`と `onFailure`が引数として定義されるという共通のパターンがありますが、このパターンはソースコードに付随したモジュールのドキュメントに記述することで実施しなければなりません。このパターンを管理するには型システムのほうがよいですし、型システムで使い方を強制しておくほうがいいでしょう。

次に、これらの問題を解決するために、これまでに学んだ手法を使用する方法について説明していきます。

## 継続モナド

`copyFile`の例をFFIを使ってPureScriptへと翻訳していきましょう。PureScriptで書いていくにつれ、計算の構造はわかりやすくなり、 `purescript-transformers`パッケージで定義されている継続モナド変換子 `ContT`が自然に導入されることになるでしょう。

まず、FFIを使って `readFile`と `writeFile`に型を与えなくてはなりません。型同義語をいくつかと、ファイル入出力のための作用を定義することから始めましょう。

```haskell
foreign import data FS :: Effect

type ErrorCode = String
type FilePath = String
```

`readFile`はファイル名と2引数のコールバックを引数に取ります。ファイルが正常に読み込まれた場合は、2番目の引数にはファイルの内容が含まれますが、そうでない場合は、最初の引数がエラーを示すために使われます。

今回は `readFile`を2つのコールバックを引数としてとる関数としてラップすることにします。先ほどの `copyFile`や `writeCopy`とまったく同じように、エラーコールバック(`onFailure`)と結果コールバック(`onSuccess`)の2つです。簡単のために `Data.Function`の多引数関数の機能を使うと、このラップされた関数 `readFileImpl`は次のようになるでしょう。

```haskell
foreign import readFileImpl
  :: forall eff
   . Fn3 FilePath
         (String -> Eff (fs :: FS | eff) Unit)
         (ErrorCode -> Eff (fs :: FS | eff) Unit)
         (Eff (fs :: FS | eff) Unit)
```

JavaScriptモジュールでは、 `readFileImpl`は次のように定義されます。

```javascript
exports.readFileImpl = function(path, onSuccess, onFailure) {
  return function() {
    require('fs').readFile(path, {
      encoding: 'utf-8'
    }, function(error, data) {
      if (error) {
        onFailure(error.code)();
      } else {
        onSuccess(data)();
      }
    });
  };
};
```

`readFileImpl`はファイルパス、成功時のコールバック、失敗時のコールバックという３つの引数を取り、空(`Unit`)の結果を返す副作用のある計算を返す、ということをこの型は言っています。コー​​ルバック自身にも、その作用を追跡するために `Eff`モナドを使うような型が与えられていることに注意してください。

この `readFileImpl`の実装がその型の正しい実行時表現を持っている理由を、よく理解しておくようにしてください。

`writeFileImpl`もよく似ています。違いはファイルがコールバックではなく関数自身に渡されるということだけです。実装は次のようになります。

```haskell
foreign import writeFileImpl
  :: forall eff
   . Fn4 FilePath
         String
         (Eff (fs :: FS | eff) Unit)
         (ErrorCode -> Eff (fs :: FS | eff) Unit)
         (Eff (fs :: FS | eff) Unit)
```

```javascript
exports.writeFileImpl = function(path, data, onSuccess, onFailure) {
  return function() {
    require('fs').writeFile(path, data, {
      encoding: 'utf-8'
    }, function(error) {
      if (error) {
        onFailure(error.code)();
      } else {
        onSuccess();
      }
    });
  };
};
```

これらのFFIの宣言が与えられれば、 `readFile`と `writeFile`の実装を書くことができます。 `Data.Function`ライブラリを使って、多引数のFFIバインディングを通常の(カリー化された)PureScript関数へと変換するので、もう少し読みやすい型になるでしょう。

さらに、成功時と失敗時の２つの必須のコールバックに代わって、成功か失敗の**どちらか**(Either) に対応した単一のコールバックを要求するようにします。つまり、新しいコールバックは引数として `Either ErrorCode`モナドの値をとります。

```haskell
readFile :: forall eff . FilePath
  -> (Either ErrorCode String -> Eff (fs :: FS | eff) Unit)
  -> Eff (fs :: FS | eff) Unit
readFile path k =
  runFn3 readFileImpl
         path
         (k <<< Right)
         (k <<< Left)

writeFile :: forall eff . FilePath
  -> String
  -> (Either ErrorCode Unit -> Eff (fs :: FS | eff) Unit)
  -> Eff (fs :: FS | eff) Unit
writeFile path text k =
  runFn4 writeFileImpl
         path
         text
         (k $ Right unit)
         (k <<< Left)
```

ここで、重要なパターンを見つけることができます。これらの関数は何らかのモナド(この場合は `Eff (fs :: FS | eff)`)で値を返すコールバックをとり、**同一のモナド**で値を返します。これは、最初のコールバックが結果を返したときに、そのモナドは次の非同期関数の入力に結合するためにその結果を使用することができることを意味しています。実際、 `copyFile`の例で手作業でやったことがまさにそれです。

これは `purescript-transformers`の `Control.Monad.Cont.Trans`モジュールで定義されている**継続モナド変換子**(continuation monad transformer)の基礎となっています。

`ContT`は次のようなnewtypeとして定義されます。

```haskell
newtype ContT r m a = ContT ((a -> m r) -> m r)
```

**継続**(continuation)はコールバックの別名です。継続は計算の**残余**(remainder)を捕捉します。ここで「残余」とは、非同期呼び出しが行われ、結果が提供された後に起こることを指しています。

`ContT`データ構築子の引数は `readFile`と `writeFile`の型ととてもよく似ています。実際、もし型 `a`を型 `ErrorCode String`、 `r`を `Unit`、 `m`をモナド `Eff(fs :: FS | eff)`というように選ぶと、 `readFile`の型の右辺を復元することができます。 

`readFile`と `writeFile`を組み立てる `Async`モナドを定義するため、型同義語を導入します。

```haskell
type Async eff = ContT Unit (Eff eff)
```

今回の目的では `Eff`モナドを変換するために常に `ContT`を使い、型 `r`は常に `Unit`になりますが、このことは必須ではありません。

`ContT`データ構築子を適用するだけで、 `readFile`と `writeFile`を `Async`モナドの計算として扱うことができます。

```haskell
readFileCont
  :: forall eff
   . FilePath
  -> Async (fs :: FS | eff) (Either ErrorCode String)
readFileCont path = ContT $ readFile path

writeFileCont
  :: forall eff
   . FilePath
  -> String
  -> Async (fs :: FS | eff) (Either ErrorCode Unit)
writeFileCont path text = ContT $ writeFile path text
```

ここで `ContT`モナド変換子に対してdo記法を使うだけで、ファイル複製処理を書くことができます。

```haskell
copyFileCont
  :: forall eff
   . FilePath
  -> FilePath
  -> Async (fs :: FS | eff) (Either ErrorCode Unit)
copyFileCont src dest = do
  e <- readFileCont src
  case e of
    Left err -> pure $ Left err
    Right content -> writeFileCont dest content
```

`readFileCont`の非同期性がdo記法によってモナドの束縛に隠されていることに注目してください。これはまさに同期的なコードのように見えますが、 `ContT`モナド変換子は非同期関数を書くのを手助けしているのです。

継続を与えて `runContT`ハンドラを使うと、この計算を実行することができます。この継続は**次に何をするか**、例えば非同期なファイル複製処理が完了した時に何をするか、を表しています。この簡単な例では、型 `Either ErrorCode Unit`の結果をコンソールに出力する `logShow`関数を単に継続として選んでいます。

```haskell
import Prelude

import Control.Monad.Eff.Console (logShow)
import Control.Monad.Cont.Trans (runContT)

main =
  runContT
    (copyFileCont "/tmp/1.txt" "/tmp/2.txt")
    logShow
```

> ## 演習 {-}
> 
> 1. (簡単)`readFileCont`と `writeFileCont`を使って、2つのテキストフ​​ァイルを連結する関数を書いてください。
> 
> 1. (やや難しい) FFIを使って、 `setTimeout`関数に適切な型を与えてください。また、 `Async`モナドを使った次のようなラッパー関数を書いてください。
> 
>     ```haskell
>     type Milliseconds = Int
> 
>     foreign import data TIMEOUT :: Effect
> 
>     setTimeoutCont
>       :: forall eff
>        . Milliseconds
>       -> Async (timeout :: TIMEOUT | eff) Unit
>     ```

## ExceptTを機能させる

この方法はうまく動きますが、まだ改良の余地があります。

`copyFileCont`の実装において、次に何をするかを決定するためには、パターン照合を使って(型 `Either ErrorCode String`の)`readFileCont`計算の結果を解析しなければなりません。しかしながら、 `Either`モナドは対応するモナド変換子 `ExceptT`を持っていることがわかっているので、 `ContT`を持つ `ExceptT`を使って非同期計算とエラー処理の２つの作用を結合できると期待するのは理にかなっています。

実際にそれは可能で、 `ExceptT`の定義を見ればそれがなぜかがわかります。

```haskell
newtype ExceptT e m a = ExceptT (m (Either e a))
```

`ExceptT`は基礎のモナドの結果を単純に `a`から `Either e a`に変更します。現在のモナドスタックを `ExceptT ErrorCode`変換子で変換するように、 `copyFileCont`を書き換えることができることを意味します。それは現在の方法に `ExceptT`データ構築子を適用するだけなので簡単です。型同義語を与えると、ここでも型シグネチャを整理することができます。

```haskell
readFileContEx
  :: forall eff
   . FilePath
  -> ExceptT ErrorCode (Async (fs :: FS | eff)) String
readFileContEx path = ExceptT $ readFileCont path

writeFileContEx
  :: forall eff
   . FilePath
  -> String
  -> ExceptT ErrorCode (Async (fs :: FS | eff)) Unit
writeFileContEx path text = ExceptT $ writeFileCont path text
```

非同期エラー処理が `ExceptT`モナド変換子の内部に隠されているので、このファイル複製処理ははるかに単純になります。

```haskell
copyFileContEx
  :: forall eff
   . FilePath
  -> FilePath
  -> ExceptT ErrorCode (Async (fs :: FS | eff)) Unit
copyFileContEx src dest = do
  content <- readFileContEx src
  writeFileContEx dest content
```

> ## 演習 {-}
> 
> 1. (やや難しい) 任意のエラーを処理するために、 `ExceptT`を使用して2つのファイルを連結しする先ほどの解決策を書きなおしてください。
>
> 1. (やや難しい) 入力ファイル名の配列を与えて複数のテキストファイルを連結する関数 `concatenateMany`を書く。 **ヒント**：`traverse`を使用します。

## HTTPクライアント

`ContT`を使って非同期機能を処理する例として、この章のソースコードの `Network.HTTP.Client`モジュールについても見ていきましょう。このモジュールでは `Async`モナドを使用して、NodeJSの非同期を `request`モジュールを使っています。

`request`モジュールは、URLとコールバックを受け取り、応答が利用可能なとき、またはエラーが発生したときにHTTP（S）リクエストを生成してコールバックを呼び出す関数を提供します。 リクエストの例を次に示します。

```javascript
require('request')('http://purescript.org'), function(err, _, body) {
  if (err) {
    console.error(err);
  } else {
    console.log(body);
  }
});
```

`Async`モナドを使ってこの簡単な例をPureScriptに再作成します。

`Network.HTTP.Client`モジュールでは、 `request`メソッドは以下のようなAPIを持つ関数 `getImpl`としてラップされています。

```haskell
foreign import data HTTP :: Effect

type URI = String

foreign import getImpl
  :: forall eff
   . Fn3 URI
         (String -> Eff (http :: HTTP | eff) Unit)
         (String -> Eff (http :: HTTP | eff) Unit)
         (Eff (http :: HTTP | eff) Unit)
```

```javascript
exports.getImpl = function(uri, done, fail) {
  return function() {
    require('request')(uri, function(err, _, body) {
      if (err) {
        fail(err)();
      } else {
        done(body)();
      }
    });
  };
};
```

再び `Data.Function.Uncurried`モジュールを使って、これを通常のカリー化されたPureScript関数に変換します。先ほどと同じように、２つのコールバックを型 `Maybe Chunk`の値を受け入れるひとつのコールバックに変換しています。 `String String`型の値を受け取り、 `ContT`データ構築子を適用して `Async`モナドのアクションを構築します。

```haskell
get :: forall eff.
  URI ->
  Async (http :: HTTP | eff) (Either String String)
get req = ContT \k ->
  runFn3 getImpl req (k <<< Right) (k <<< Left)
```

> ## 演習 {-}
> 
> 1. (やや難しい)`runContT`を使ってHTTP応答の各チャンクをコンソールへ出力することで、 `get`を試してみてください。
> 
> 1. (やや難しい)`readFileCont`と `writeFileCont`に対して以前に行ったように、 `ExceptT`を使い `get`をラップする関数 `getEx`を書いてください。
>
> 1.（難しい） `getEx`と `writeFileContEx`を使って、ディスク上のファイルからの内容をを保存する関数を書いてください。

## 並列計算

`ContT`モナドとdo記法を使って、非同期計算を順番に実行されるように合成する方法を見てきました。非同期計算を**並列に**合成することもできたら便利でしょう。

`Eff`モナドを変換するために `ContT`を使用している場合、単に２つの計算のうち一方を開始した後に他方の計算を開始すれば、並列に計算することができます。

クラスは2つの関数を定義します。

- `parallel`：モナド `m`を計算し、それを応用ファンクタ `f`の計算に変換します。
- `sequential`：反対方向の変換を行います。

`purescript-parallel`ライブラリは `Async`モナドの `Parallel`インスタンスを提供します。 これは、2つの連続のどれが呼び出されたかを追跡することによって、変更可能な参照を使用して並列に `Async`アクションを組み合わせます。 両方の結果が返されたら、最終結果を計算してメインの継続に渡すことができます。

`parallel`関数を使って `readFileCont`アクションのバージョンを作成することができます。これは並列に組み合わせることができます。
２つのテキストファイルを並列に読み取り、連結してその結果を出力する簡単な例は次のようになります。

`Parallel`型構築子を使用して並列に二つのファイルを読むように上の例を書き直すことができるようになりました。

```haskell
import Prelude
import Control.Apply (lift2)
import Control.Monad.Cont.Trans (runContT)
import Control.Monad.Eff.Console (logShow)
import Control.Monad.Parallel (parallel, sequential)

main = flip runContT logShow do
  sequential $
   lift2 append
     <$> parallel (readFileCont "/tmp/1.txt")
     <*> parallel (readFileCont "/tmp/2.txt")
```

`readFileCont`は `Either ErrorCode String`型の値を返すので、 `lift2`を使って `Either`型構築子より `append`関数を持ち上げて結合関数を形成する必要があることに注意してください。
Applicative関手では任意個引数の関数の持ち上げができるので、このApplicativeコンビネータを使ってより多くの計算を並列に実行することができます。 `traverse`と `sequence`のようなApplicative関手を扱うすべての標準ライブラリ関数から恩恵を受けることもできます。

必要に応じて `Parralel`と `runParallel`を使って型構築子を変更することで、do記法ブロックのApplicativeコンビネータを使って、直列的なコードの一部で並列計算を結合したり、またはその逆を行ったりすることができます。

> ## 演習 {-}
> 
> 1. (簡単)`parallel`と ` sequential`を使って2つのHTTPリクエストを作成し、それらのレスポンス内容を並行して収集します。あなたの結合関数は2つのレスポンス内容を連結しなければならず、続けて `print`を使って結果をコンソールに出力してください。
>
> 1. (やや難しい)`Async`に対応するapplicative関手は ` Alternative`のインスタンスです。このインスタンスによって定義される `<|>`演算子は2つの計算を並列に実行し、最初に完了する計算結果を返します。
>
>     この `Alternative`インスタンスを `setTimeoutCont`関数と共に使用して関数を定義してください。
>
>     ```haskell
>     timeout :: forall a eff
>              . Milliseconds
>             -> Async (timeout :: TIMEOUT | eff) a
>             -> Async (timeout :: TIMEOUT | eff) (Maybe a)
>     ```
>
>     指定された計算が指定されたミリ秒数以内に結果を提供しない場合、 `Nothing`を返します。
>
> 1. (やや難しい)`purescript-parallel`は `ExceptT`を含むいくつかのモナド変換子のための `Parallel`クラスのインスタンスも提供します。
>
>     `lift2`で `append`を持ち上げる代わりに、 `ExceptT`を使ってエラー処理を行うように、並列ファイル入出力の例を書きなおしてください。解決策は `Async`モナドを変換するために `ExceptT`変換子を使うとよいでしょう。
> 
>     同様の手法で複数の入力ファイルを並列に読み込むために `concatenateMany`関数を書き換えてください。
>     
> 1. (難しい、拡張) ディスク上のJSON文書の配列が与えられ、それぞれの文書はディスク上の他のファイルへの参照の配列を含んでいるとします。
> 
>    ```javascript
>    { references: ['/tmp/1.json', '/tmp/2.json'] }
>    ```
>     入力として単一のファイル名をとり、そのファイルから参照されているディスク上のすべてのJSONファイルをたどって、参照されたすべてのファイルの一覧を収集するユーティリティを書いてください。
> 
>     そのユーティリティは、JSON文書を解析するために `purescript-foreign`ライブラリを使用する必要があり、単一のファイルが参照するファイルは並列に取得しなければなりません！
## まとめ

この章ではモナド変換子の実用的なデモンストレーションを見てきました。

- コールバック渡しの一般的なJavaScriptのイディオムを `ContT`モナド変換子によって捉えることができる方法を説明しました。
- どのようにコールバック地獄の問題を解決するかを説明しました。　直列の非同期計算を表現するdo記法を使用して、かつ並列性を表現するためにApplicative関手によって解決することができる方法を説明しました。
- **非同期エラー**を表現するために `ExceptT`を使いました。


