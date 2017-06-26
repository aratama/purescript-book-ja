# コールバック地獄

## この章の目標

この章では、これまでに見てきたモナド変換子やApplicative関手といった道具が、現実世界の問題解決にどのように役立つかを見ていきましょう。ここでは特に、**コールバック地獄**(callback hell)の問題を解決について見ていきます。

## プロジェクトの準備

この章のソースコードは、`grunt`でコンパイルし、NodeJSを使って実行することができます。

## 問題

通常、JavaScriptの非同期処理コードでは、プログラムの流れを構造化するために**コールバック**(callbacks)を使用します。たとえば、ファイルからテキストを読み取るのに好ましいアプローチとしては、`readFile`関数を使用し、コールバック、つまりテキストが利用可能になったときに呼び出される関数を渡すことです。

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

- 上で`writeCopy`へ`data`を渡したのと同じ方法で、非同期関数に関数の引数として途中の結果を渡さなければなりません。これは小さな関数についてはうまくいきますが、多くのコールバック関係する場合はデータの依存関係は複雑になることがあり、関数の引数が大量に追加される結果になります。
- どんな非同期関数でもコールバック`onSuccess`と`onFailure`が引数として定義されるという共通のパターンがありますが、このパターンはソースコードに付随したモジュールのドキュメントに記述することで実施しなければなりません。このパターンを管理するには型システムのほうがよいですし、型システムで使い方を強制しておくほうがいいでしょう。

次に、これらの問題を解決するために、これまでに学んだ手法を使用する方法について説明していきます。

## 継続モナド

`copyFile`の例をFFIを使ってPureScriptへと翻訳していきましょう。PureScriptで書いていくにつれ、計算の構造はわかりやすくなり、`purescript-transformers`パッケージで定義されている継続モナド変換子`ContT`が自然に導入されることになるでしょう。

まず、FFIを使って`readFile`と`writeFile`に型を与えなくてはなりません。型同義語をいくつかと、ファイル入出力のための作用を定義することから始めましょう。

```haskell
foreign import data FS :: !

type ErrorCode = String
type FilePath = String
```

`readFile`はファイル名と2引数のコールバックを引数に取ります。ファイルが正常に読み込まれた場合は、2番目の引数にはファイルの内容が含まれますが、そうでない場合は、最初の引数がエラーを示すために使われます。

今回は`readFile`を2つのコールバックを引数としてとる関数としてラップすることにします。先ほどの`copyFile`や`writeCopy`とまったく同じように、エラーコールバック(`onFailure`)と結果コールバック(`onSuccess`)の2つです。簡単のために`Data.Function`の多引数関数の機能を使うと、このラップされた関数`readFileImpl`は次のようになるでしょう。

```haskell
foreign import readFileImpl
  "function readFileImpl(path, onSuccess, onFailure) {\
  \  return function() {\
  \    require('fs').readFile(path, \
  \      { encoding: 'utf-8' }, \
  \      function(error, data) {\
  \        if (error) {\
  \          onFailure(error.code)();\
  \        } else {\
  \          onSuccess(data)();\
  \        }\
  \      }\
  \    );\
  \  };\
  \}" :: forall eff. Fn3 FilePath
                         (String -> Eff (fs :: FS | eff) Unit)
                         (ErrorCode -> Eff (fs :: FS | eff) Unit)
                         (Eff (fs :: FS | eff) Unit)
```

`readFileImpl`はファイルパス、成功時のコールバック、失敗時のコールバックという３つの引数を取り、空(`Unit`)の結果を返す副作用のある計算を返す、ということをこの型は言っています。コー​​ルバック自身にも、その作用を追跡するために`Eff`モナドを使うような型が与えられていることに注意してください。

この`readFileImpl`の実装がその型の正しい実行時表現を持っている理由を、よく理解しておくようにしてください。

`writeFileImpl`もよく似ています。違いはファイルがコールバックではなく関数自身に渡されるということだけです。実装は次のようになります。

```haskell
foreign import writeFileImpl
  "function writeFileImpl(path, data, onSuccess, onFailure) {\
  \  return function() {\
  \    require('fs').writeFile(path, data, \
  \      { encoding: 'utf-8' }, \
  \      function(error) {\
  \        if (error) {\
  \          onFailure(error.code)();\
  \        } else {\
  \          onSuccess();\
  \        }\
  \      }\
  \    );\
  \  };\
  \}" :: forall eff. Fn4 FilePath
                         String
                         (Eff (fs :: FS | eff) Unit)
                         (ErrorCode -> Eff (fs :: FS | eff) Unit)
                         (Eff (fs :: FS | eff) Unit)
```

これらのFFIの宣言が与えられれば、`readFile`と`writeFile`の実装を書くことができます。`Data.Function`ライブラリを使って、多引数のFFIバインディングを通常の(カリー化された)PureScript関数へと変換するので、もう少し読みやすい型になるでしょう。

さらに、成功時と失敗時の２つの必須のコールバックに代わって、成功か失敗の**どちらか**(Either) に対応した単一のコールバックを要求するようにします。つまり、新しいコールバックは引数として`Either ErrorCode`モナドの値をとります。

```haskell
readFile :: forall eff. 
  FilePath -> 
  (Either ErrorCode String -> Eff (fs :: FS | eff) Unit) -> 
  Eff (fs :: FS | eff) Unit
readFile path k = 
  runFn3 readFileImpl 
         path 
         (k <<< Right) 
         (k <<< Left)

writeFile :: forall eff. 
  FilePath -> 
  String -> 
  (Either ErrorCode Unit -> Eff (fs :: FS | eff) Unit) -> 
  Eff (fs :: FS | eff) Unit
writeFile path text k = 
  runFn4 writeFileImpl 
         path 
         text 
         (k $ Right unit) 
         (k <<< Left)
```

`Eff`モナドはこれらの型シグネチャの両方に現れます。次のような新しい型同義語を導入すると、型を​​簡素化できます。

```haskell
type M eff = Eff (fs :: FS | eff)

readFile :: forall eff. 
  FilePath -> 
  (Either ErrorCode String -> M eff Unit) -> 
  M eff Unit

writeFile :: forall eff. 
  FilePath -> 
String
  (Either ErrorCode Unit -> M eff Unit) -> 
  M eff Unit
```

ここで、重要なパターンを見つけることができます。これらの関数は何らかのモナド(この場合は`M eff`)で値を返すコールバックをとり、**同一のモナド**で値を返します。これは、最初のコールバックが結果を返したときに、そのモナドは次の非同期関数の入力に結合するためにその結果を使用することができることを意味しています。実際、`copyFile`の例で手作業でやったことがまさにそれです。

これは`purescript-transformers`の `Control.Monad.Cont.Trans`モジュールで定義されている**継続モナド変換子**(continuation monad transformer)の基礎となっています。

`ContT`は次のようなnewtypeとして定義されます。

```haskell
newtype ContT r m a = ContT ((a -> m r) -> m r)
```

**継続**(continuation)はコールバックの別名です。継続は計算の**残余**(remainder)を捕捉します。ここで「残余」とは、非同期呼び出しが行われ、結果が提供された後に起こることを指しています。

`ContT`データ構築子の引数は`readFile`と`writeFile`の型ととてもよく似ています。実際、もし型`a` を型`Either ErrorCode String`、`r`を`Unit`、`m` をモナド`M eff`というように選ぶと、`readFile`の型の右辺を復元することができます。 

今回の目的では`Eff`モナドを変換するために常に`ContT`を使い、型`r`は常に`Unit`になりますが、このことは必須ではありません。

`ContT`構築子を適用するだけで、`readFile`と`writeFile`を`ContT Unit (M eff)`モナドの計算として扱うことができます。

```haskell
type C eff = ContT Unit (M eff)

readFileCont :: forall eff. 
  FilePath -> 
  C eff (Either ErrorCode String)
readFileCont path = ContT $ readFile path

writeFileCont :: forall eff. 
  FilePath -> 
  String -> 
  C eff (Either ErrorCode Unit)
writeFileCont path text = ContT $ writeFile path text
```

ここで`ContT`モナド変換子に対してdo記法を使うだけで、ファイル複製処理を書くことができます。

```haskell
copyFileCont :: forall eff. FilePath -> FilePath -> C eff (Either ErrorCode Unit)
copyFileCont src dest = do
  e <- readFileCont src
  case e of
    Left err -> return $ Left err
    Right content -> writeFileCont dest content
```

`readFileCont`の非同期性がdo記法によってモナドの束縛に隠されていることに注目してください。これはまさに同期的なコードのように見えますが、`ContT`モナドは非同期関数を書くのを手助けしているのです。

継続を与えて`runContT`ハンドラを使うと、この計算を実行することができます。この継続は**次に何をするか**、例えば非同期なファイル複製処理が完了した時に何をするか、を表しています。この簡単な例では、型`Either ErrorCode Unit`の結果をコンソールに出力する`print`関数を単に継続として選んでいます。

```haskell
import Debug.Trace

import Control.Monad.Eff
import Control.Monad.Cont.Trans

main = runContT 
  (copyFileCont "/tmp/1.txt" "/tmp/2.txt") 
  print
```

> ## 演習 {-}
> 
> 1. (簡単) `readFileCont`と`writeFileCont`を使って、2つのテキストフ​​ァイルを連結する関数を書いてください。
> 
> 1. (やや難しい) FFIを使って、`setTimeout`関数に適切な型を与えてください。また、`ContT`モナド変換子を使った次のようなラッパー関数を書いてください。
> 
>     ```haskell
>     type Milliseconds = Number
> 
>     foreign import data Timeout :: !
> 
>     setTimeoutCont :: forall eff. 
>       Milliseconds -> 
>       ContT Unit (Eff (timeout :: Timeout | eff)) Unit
>     ```

## ErrorTを機能させる

この方法はうまく動きますが、まだ改良の余地があります。

`copyFileCont`の実装において、次に何をするかを決定するためには、パターン照合を使って(型`Either ErrorCode String`の)`readFileCont`計算の結果を解析しなければなりません。しかしながら、`Either`モナドは対応するモナド変換子`ErrorT`を持っていることがわかっているので、`ErrorT`を使って非同期計算とエラー処理の２つの作用を結合できると期待するのは理にかなっています。

実際にそれは可能で、`ErrorT`の定義を見ればそれがなぜかがわかります。

```haskell
newtype ErrorT e m a = ErrorT (m (Either e a))
```

`ErrorT`は基礎のモナドの結果を単純に`a`から`Either e a`に変更します。現在のモナドスタックを`ErrorT ErrorCode`変換子で変換するように、`copyFileCont`を書き換えることができることを意味します。それは現在の方法に`ErrorT`データ構築子を適用するだけなので簡単です。型同義語を与えると、ここでも型シグネチャを整理することができます。

```haskell
type EC eff = ErrorT ErrorCode (C eff)

readFileContErr :: forall eff. FilePath -> EC eff String
readFileContErr path = ErrorT $ readFileCont path

writeFileContErr :: forall eff. FilePath -> String -> EC eff Unit
writeFileContErr path text = ErrorT $ writeFileCont path text
```

非同期エラー処理が`ErrorT`モナド変換子の内部に隠されているので、このファイル複製処理ははるかに単純になります。

```haskell
copyFileContErr :: forall eff. FilePath -> FilePath -> EC eff Unit
copyFileContErr src dest = do
  content <- readFileContErr src
  writeFileContErr dest content
```

> ## 演習 {-}
> 
> 1. (やや難しい) 任意のエラーを処理するために、`ErrorT`を使用して2つのファイルを連結しする先ほどの解決策を書きなおしてください。

## HTTPクライアント

`ContT`を使って非同期機能を処理する例として、この章のソースコードの`Network.HTTP.Client`モジュールについても見ていきましょう。このモジュールでは、NodeJSの非同期HTTPリクエストをラップするために継続を使っています。

`http`モジュールを使った典型的な`GET`リクエストは次のようになります。

```javascript
function getRequest(onChunk, onComplete) {
  return function() {
    require('http').request({
      host: 'www.purescript.org',
      path: '/' 
    }, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        onChunk(chunk);
      });
      res.on('end', function () {
        onComplete();
      });
    }).end();
  };
}
```

`http`モジュールの` request`メソッドは、ホストとパスを指定するオブジェクトをとり、レスポンスオブジェクトを返します。レスポンスオブジェクトは今回扱う2種類のイベントを発します。

- レスポンスの新しいチャンクが使用可能であることを示す `data`イベント
- レスポンスが完了したことを示す `end`イベント

上の例では、`data`と` end`イベントが発生した時に呼び出される2つのコールバック `onChunk`と`onComplete`を渡しています。

`Network.HTTP.Client`モジュールでは、 `request`メソッドは以下のようなAPIを持つ関数` getImpl`としてラップされています。

```haskell
foreign import data HTTP :: !

type WithHTTP eff = Eff (http :: HTTP | eff)

newtype Request = Request
  { host :: String
  , path :: String
  }

newtype Chunk = Chunk String

getImpl :: forall eff. 
  Fn3 Request
      (Chunk -> WithHTTP eff Unit)
      (WithHTTP eff Unit)
      (WithHTTP eff Unit)
```

再び`Data.Function`モジュールを使って、これを通常のカリー化されたPureScript関数に変換します。先ほどと同じように、２つのコールバックを型`Maybe Chunk`の値を受け入れるひとつのコールバックに変換しています。コールバックに渡された`Nothing`の値は`end`イベントに対応しており、`Just chunk`の値は`deta`イベントに対応しています。

```haskell
getChunk :: forall eff. 
  Request ->
  (Maybe Chunk -> WithHTTP eff Unit) ->
  WithHTTP eff Unit
getChunk req k = 
  runFn3 getImpl 
         req 
         (k <<< Just) 
         (k Nothing)
```

ここでも`ContT`データ構築子を適用することにより、この非同期関数をこの継続モナドの演算に変換しています。

```haskell
getCont :: forall eff. 
  Request -> 
  ContT Unit (WithHTTP eff) (Maybe Chunk)
getCont req = ContT $ getChunk req
```

`readFile`の例では、ファイルの内容が利用可能になったとき(または、エラーが発生したとき)、コールバックは一度だけ呼ばれていました。しかし今度は、レスポンスのそれぞれのチャンクについて１回づつ、複数回コールバックが呼び出されることが期待されます。

> ## 演習 {-}
> 
> 1. (やや難しい) `runContT`を使ってHTTP応答の各チャンクをコンソールへ出力することで、`getCont`を試してみてください。
> 
> 1. (難しい) `getImpl`と`getCont`関数は非同期エラーを処理しません。`getImpl`を`error`イベントに対応するよう変更し、`ErrorT`を使って非同期エラーを表現する`getCont`の亜種を書いてください。 
> 
>     **ヒント**： `readFile`の例で取ったのと同じアプローチに従うことができます。

## チャンク応答の畳み込み

これでHTTP応答の個々のチャンクを集めることができるようになりましたが、すべての応答が利用可能になったときだけ継続が呼び出される非同期関数を作ると便利な時があるかもしれません。このような関数を実装する方法のひとつは、HTTP応答のチャンクに対する**畳み込み**を書くことです。

継続に渡された複数の結果を畳み込む関数`foldC`を書きましょう。`foldC`関数はこの章のソースコードの`Control.Monad.Cont.Extras`モジュールで定義されています。

累積値を追跡するために、`Eff`モナドで`Ref`作用を使います。次の型同義語を使って型シグネチャを整理します。

```haskell
type WithRef eff = Eff (ref :: Ref | eff)

type ContRef eff = ContT Unit (WithRef eff)
```

これらの同義語を使うと、`foldC`には次のような型を与えることができます。

```haskell
foldC :: forall eff a b r. 
  (b -> a -> Either b r) -> 
  b -> ContRef eff a -> ContRef eff r
```

`foldC`に渡された関数は、現在の累積値と継続に渡された値を受け取り、新しい累積値か新しい継続に渡される結果のどちらかを返します。

`foldC`が実装されれば、応答のデータ本体の様々なチャンクの収集を可能にする簡単な関数`collect`を書くことができます。

```haskell
collect :: forall eff a. 
  ContRef eff (Maybe a) -> 
  ContRef eff [a]
collect = foldC f []
  where
  f xs Nothing = Right xs
  f xs (Just x) = Left (xs ++ [x])
```

`foldC`の実装では、累積値の初期値を持つ新しい参照を作成して開始します。この参照は、コールバックの本体でそれが変更されるときに、累積器を追跡し続けるために使用されます。

```haskell
foldC f b0 c = do
  current <- lift $ newRef b0
```

また、`foldC`は**現在の継続とともに呼び出す**(call with current continuation)を略して`callCC`と呼ばれる関数を使っています。`callCC`は引数として関数をひとつ取りますが、この関数は**現在の継続**、つまり現在のdo記法ブロックの`callCC`の**あと**のコードを表しています。現在の継続に返り値を渡すと、`callCC`内のコードのブロックからいつでも早期に返ることができます。

```haskell
  callCC $ \k -> quietly $ do
```

ここで`k`は現在の継続です。これは `foldC`を定義するdo記法ブロックの最後の式であるため、現在の継続は実際には`foldC`に渡されたちょうどその継続です。畳み込み関数の結果が累積の結果を表しているとき、`foldC`の最終的な値にこれを使います。

`quietly`コンビネータは`where`宣言で定義されており、あとでその定義について見ていきます。`quietly`コンビネータの役目は、ここで明示的に`k`を呼び出さない場合に、`callCC`の内側のコードがその継続へ値を返すのを妨げることです。これが必要な理由はすぐに明らかになるはずです。

次に、`foldC`は非同期関数`c`の結果を名前`a`に束縛します。

```haskell
    a <- c
```

もとの計算によって新しい値が非同期に生成されたとき(この場合は、HTTP応答の新しいチャンクが利用可能になったとき)、この行の後ろのコードが実行されるでしょう。それが起こるとき、畳み込み関数を適用したいので、次のように累積器の現在の値を読み取る必要があります。

```haskell
    r <- lift $ readRef current
```

最後に、畳み込み関数を評価し、その結果に応じて2つの場合に場合分けします。畳み込み関数が新しい累積値を返すなら、参照を新しい値で更新します。畳み込み関数が結果を返すなら、これを継続`k`に渡します。

```haskell
    case f b a of
      Left next -> lift $ writeRef current next
      Right r -> k r
```

ここで`quietly`関数が必要だった理由が明らかになったと思います。`callCC`内部のコードの結果
を`quietly`関数で黙らせなかったら、畳み込み関数が`Left`構築子で包んだ値を返すとき、型`r`の結果を生成しなければならなくなったでしょう。しかし、そのような結果を生成する方法は一切ありません！

`quietly`関数の定義は次のようになっています。`quietly`は非同期関数の結果の型を変更できるようにします。これは継続関数を変換することを可能にする`withContT`関数を使って書かれています。

```haskell
  where
  quietly :: forall m a b. (Monad m) => ContT Unit m a -> ContT Unit m b
  quietly = withContT (\_ _ -> return unit)
```

`foldC`関数とその亜種`collect`は特に、チャンクが利用可能になった時に連結することで、完全なHTTP応答本体を累積することを可能にします。

```haskell
newtype Response = Response [Chunk]

getAll :: forall eff. 
  Request -> 
  ContT Unit (WithHTTP (ref :: Ref | eff)) Response
getAll req = Response <$> collect (getCont req)
```

これで、`String`として応答本体を次のように取得することができます。

```haskell
getResponseText :: forall eff. 
  Request -> 
  ContT Unit (WithHTTP (ref :: Ref | eff)) String
getResponseText req = responseToString <$> getAll req
  where
  responseToString :: Response -> String
  responseToString (Response chunks) = joinWith "" $ map runChunk chunks
```

例えば、次のように継続の中で`getResponseText`と`trace`アクションを使えば、HTTP応答本体の長さをコンソールに出力することができるでしょう。

```main
main = runContT (getResponseText request) $ \response -> do
  let responseLength = length response
  trace responseLength
  
  where
  request :: Request
  request = Request
    { host: "www.purescript.org"
    , path: "/"
    }
```

これはうまく動作しますが、次の演習で見るように、もっと慎重に`foldC`を使うとこの方法を改良することができます。

> ## 演習 {-}
> 
> 1. (やや難しい) `writeFileCont`を使用して、ディスク上のファイルにそのHTTP要求の応答本体を保存する関数を書いてください。
> 
> 1. (難しい) 長さを決定するのに、メモリ内のHTTP応答本体全体を連結する必要はありません。チャンクが利用可能になるたびにそのバイトサイズを調べるようにすれば、応答全体のザイズから単一のチャンクのサイズへと、この関数のメモリ使用量を低減することができます。
> 
>     `collect`の代わりに`foldC`を直接使って、このコード例を書きなおしてください。

## 並列計算

 `ContT`モナドとdo記法を使って、非同期計算を順番に実行されるように合成する方法を見てきました。非同期計算を**並列に**合成することもできたら便利でしょう。

`Eff`モナドを変換するために`ContT`を使用している場合、単に２つの計算のうち一方を開始した後に他方の計算を開始すれば、並列に計算することができます。

次のような型シグネチャを持つ関数を書きましょう。

```haskell
par :: forall a b r eff. 
  (a -> b -> r) -> 
  ContRef eff a -> ContRef eff b -> ContRef eff r
```

`par`は、2つの非同期計算とその結果を合成する関数をとり、並列に計算を実行し結果を合成するような単一の計算を返します。

(`Ref`作用で)変更可能な参照を使い、呼び出された2つの継続を追跡します。両方の結果が返ってきたとき、最終的な結果を計算し、メインの継続に渡すことができます。

直接`ContT`データ構築子で値を構築すると、`par`を最も簡単に実装できます。

```haskell
par f ca cb = ContT $ \k -> do
```

ここで`f`は合成を行う関数で、`ca`と `cb`はそれぞれ型`a`と`b`の値を返す非同期的な計算です。`k`は`ca`と`cb`の両方が完了した時に型`r`の値を返すのに使う継続です。

利用可能になったときに`ca`と`cb`の結果を保持するために、2つの新しい参照を作成することから始めます。

```haskell
  ra <- newRef Nothing
  rb <- newRef Nothing
```

これらの参照`ra`と`rb`は、それぞれ型`Maybe a`と`Maybe b`の値を保持します。どちらも最初は`Nothiing`の値が格納されていますが、計算が完了したとき値が更新されます。

次に、`runContT`を使用して最初の非同期計算を開始します。

```haskell
  runContT ca $ \a -> do
    mb <- readRef rb
    case mb of
      Nothing -> writeRef ra $ Just a
      Just b -> k (f a b)
```

第二の値が利用可能であるかどうかを調べるする継続を提供します。そうである場合は、継続 `k`に最終結果を渡すために結合関数を使用します。そうでなければ、単に最初の値を含むように参照`ra`を更新します。

ふたつめの計算についても同様です。

```haskell
  runContT cb $ \b -> do
    ma <- readRef ra
    case ma of
      Nothing -> writeRef rb $ Just b
      Just a -> k (f a b)
```

`par`コンビネータを使うと、ふたつのファイルを並列に読んだり、2つのHTTP要求を平行して発行し、並列に結果を待つことができます。

２つのテキストファイルを並列に読み取り、連結してその結果を出力する簡単な例は次のようになります。

```haskell
import Control.Apply (lift2)

main = flip runContT print $
  par (lift2 (++)) (readFileCont "/tmp/1.txt")
                   (readFileCont "/tmp/2.txt")
```

`readFileCont`は型`Either ErrorCode String`の値を返すので、結合関数を作るには`lift2`を使って演算子`(++)`を`Either`型構築子まで持ち上げなければいけません。

> ## 演習 {-}
> 
> 1. (簡単) `par`を使用して、２つのHTTP要求を作成し、並列に応答本体を集めてください。結合関数は2つの応答本体を連結する必要があり、継続は`trace`を使用してコンソールに結果を出力しなくてはいけません。
> 1. (やや難しい) ２つの計算を並列に実行し、先に完了したほうの計算の結果を返す次のような関数を書いてください。
> 
>     ```haskell
>     race :: forall a eff. 
>       ContRef eff a -> 
>       ContRef eff a -> 
>       ContRef eff a
>     ```
>     
>     **ヒント**：結果が返されたかどうかを示す`Boolean`を格納する参照を使ってみましょう。
> 
> 1. (やや難しい) `race`関数を`setTimeoutCont`関数と一緒に使って、次のような関数を定義してください。
> 
>     ```haskell
>     timeout :: forall a eff. 
>       Milliseconds -> 
>       ContRef eff a -> 
>       ContRef eff (Maybe a)
>     ```
> 
>     この関数は指定された計算が与えられたミリ秒以内で結果を返さないなら`Nothing`を返します。

##　並列処理のためのApplicative関手

`par`コンビネータの型は`ContRef eff`モナドについての`lift2`の型にとても良く似ています。実際に、`par`が**厳密に**`lift2`であるような新しいApplicative関手を定義することは可能で、`par`と`ContRef eff`に関してこれを簡単に定義することができます。

`par`に関する`ContRef eff`の`Applicative`インスタンスを定義していないのはなぜかと不思議に思われるかもしれません。これには２つの理由があります。

- 型コンストラクタが `Monad`インスタンスも持っている場合、それは通常`(<*>)`が以下の関数と同値であるという意味で、`Monad`と`Applicative`インスタンスは一致しています。

    ```haskell
    ap :: forall m a b. (Monad m) => m (a -> b) -> m a -> m b
    ap mf ma = do
      f <- mf
      a <- ma
      return (f a)
    ``` 
      
    しかしながら、この仮定的な`Applicative`インスタンスは、並列性に関して`Monad`インスタンスとは異なるでしょう。`(<*>)`は引数を並列に評価するのに対して、`ap`は２番めの計算を実行する前に、最初の計算の完了を待つからです。

- PureScriptは行型を含む型の型クラスのインスタンスを許可していません。`Eff`モナドは作用の行によってパラメータ化され、その場合、行は`Ref`作用を含まなければならないので、`ContRef`についての`Applicative`インスタンスを定義することは不可能なのです。

その代わりに、`Parallel eff`と呼ばれる`ContRef eff`のnewtypeラッパーを次のように作成します。

```haskell
newtype Parallel eff a = Parallel (ContRef eff a)
```

単に外側のデータ構築子を除去することで、`Parallel`計算を`ContRef eff`モナドにおける演算に変換する関数を書くことができます。

```haskell
runParallel :: forall eff a. Parallel eff a -> ContRef eff a
runParallel (Parallel c) = c
```

型クラスのインスタンスは、大部分は`ContT`の対応するインスタンスから複製することができます。しかし、`Apply`型クラスの場合には、`(<*>)`を再定義するために`par`を使用してください。

```haskell
instance functorParallel :: Functor (Parallel eff) where
  (<$>) f (Parallel c) = Parallel (f <$> c)

instance applyParallel :: Apply (Parallel eff) where
  (<*>) (Parallel f) (Parallel x) = Parallel (par ($) f x)

instance applicativeParallel :: Applicative (Parallel eff) where
  pure a = Parallel $ pure a
```

`Apply`インスタンスの定義では、結合関数として関数適用`($)`を使って、関数をその引数と結合するために`par`を使っています。

`Parallel`型構築子を使用して並列に二つのファイルを読むように上の例を書き直すことができるようになりました。

```haskell
import Control.Apply (lift2)

main = flip runContT print $ runParallel $
  lift2 (++) <$> Parallel (readFileCont "/tmp/1.txt")
             <*> Parallel (readFileCont "/tmp/2.txt")
```

Applicative関手では任意個引数の関数の持ち上げができるので、このApplicativeコンビネータを使ってより多くの計算を並列に実行することができます。`traverse`と`sequence`のようなApplicative関手を扱うすべての標準ライブラリ関数から恩恵を受けることもできます。

必要に応じて`Parralel`と`runParallel`を使って型構築子を変更することで、do記法ブロックのApplicativeコンビネータを使って、直列的なコードの一部で並列計算を結合したり、またはその逆を行ったりすることができます。

> ## 演習 {-}
> 
> 1. (簡単) `traverse`関数を使って、ファイルの名前の配列を与えるとその内容を並列に読み取り、内容の文字列表現の配列を返す関数`readMany`を書いてください。
> 
> 1. (簡単) `race`コンビネータを使って、`Parallel eff`の`Alt`インスタンスを書いてください。`Alternative`のインスタンスは作れるでしょうか。
> 
> 1. (やや難しい) `lift2`で`(++)`を持ち上げる代わりに、`ErrorT`を使ってエラー処理を行うように、並列ファイル入出力の例を書きなおしてください。解決策は`Parallel`関手を変換するために`ErrorT`変換子を使用しなければいけません。
> 
>     同様の手法で`readMany`関数を書き換えてください。
>     
> 1. (難しい、拡張) ディスク上のJSON文書のコレクションが与えられ、それぞれの文書はディスク上の他のファイルへの参照の配列を含んでいるとします。
> 
>     ```javascript
>     { references: ['/tmp/1.json', '/tmp/2.json'] }
>     ```
>     入力として単一のファイル名をとり、そのファイルから参照されているディスク上のすべてのJSONファイルをたどって、参照されたすべてのファイルの一覧を収集するユーティリティを書いてください。
> 
>     そのユーティリティは、JSON文書を解析するために `purescript-foreign`ライブラリを使用する必要があり、単一のファイルが参照するファイルは並列に取得しなければなりません！

## まとめ

この章ではモナド変換子の実用的なデモンストレーションを見てきました。

- コールバック渡しの一般的なJavaScriptのイディオムを `ContT`モナド変換子によって捉えることができる方法を説明しました。
- どのようにコールバック地獄の問題を解決するかを説明しました。　直列の非同期計算を表現するdo記法を使用して、かつ並列性を表現するためにApplicative関手によって解決することができる方法を説明しました。
- **非同期エラー**を表現するために`ErrorT`を使いました。


