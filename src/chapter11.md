# モナドの探求

## この章の目標

この章の目標は、異なるモナドから提供された副作用を合成する方法を提供する**モナド変換子**(monad transformers)について学ぶことです。NodeJSのコンソール上で遊ぶことができる、テキストアドベンチャーゲームを題材として扱います。ゲームの様々な副作用(ロギング、状態、および設定)がすべてモナド変換子スタックによって提供されます。

## プロジェクトの準備

このモジュールのプロジェクトでは以下のBower依存関係が新たに導入されます。

- `purescript-maps`　- 不変のマップと集合のためのデータ型を提供します。
- `purescript-transformers` - 標準のモナド変換子の実装を提供します。
-  ` purescript-node-readline` - NodeJSが提供する[`readline`](http://nodejs.org/api/readline.html)インターフェイスへのFFIバインディングを提供します。
- ` purescript-yargs` - [`yargs`](https://www.npmjs.org/package/yargs)コマンドライン引数処理ライブラリにApplicativeなインターフェイスを提供します。

## ゲームの遊びかた

プロジェクトを実行するには、`grunt`でソースコードをビルドしてから、NodeJSにコンパイルされたJavaScriptを渡します。

```text
$ node dist/Main.js
```

デフォルトでは使い方が表示されます。

```text
node ./dist/Main.js -p <player name>

Options:
  -p, --player  Player name  [required]
  -d, --debug   Use debug mode

Missing required arguments: p
The player name is required
```

`-p`オプションを使ってプレイヤー名を提供してください。

```text
node dist/Main.js -p Phil
> 
```

プロンプトからは、 `look`、` inventory`、 `take`、` use`、 `north`、` south`、 `east`、` west`などのコマンドを入力することができます。`--debug`コマンドラインオプションが与えられたときには、ゲームの状態を出力するための`debug`コマンドも使えます。

ゲームは2次元の碁盤の目の上でプレイし、コマンド `north`、` south`、 `east`、` west`を発行することによってプレイヤーが移動します。ゲームにはアイテムのコレクションがあり、プレイヤーの所持アイテム一覧を表したり、ゲーム盤上のその位置にあるアイテムの一覧を表すのに使われます。`take`コマンドを使うと、プレイヤーの位置にあるアイテムを拾い上げることができます。

参考までに、このゲームのひと通りの流れは次のようになります。

```text
$ node dist/Main.js -p Phil

> look
You are at (0, 0)
You are in a dark forest. You see a path to the north.
You can see the Matches.

> take Matches
You now have the Matches

> north
> look
You are at (0, 1)
You are in a clearing.
You can see the Candle.

> take Candle
You now have the Candle

> inventory
You have the Candle.
You have the Matches.

> use Matches
You light the candle.
Congratulations, Phil!
You win!
```

このゲームはとても単純ですが、この章の目的は`purescript-transformers`パッケージを使用してこのようなのゲームを素早く開発できるようにするライブラリを構築することです。

## Stateモナド

`purescript-transformers`パッケージで提供されるモナドをいくつか見てみましょう。

最初の例は、**純粋な変更可能状態**を提供する`State`モナドです。すでに `Eff`モナド、すなわち`Ref`作用と`ST`作用によって提供された変更可能な状態という2つのアプローチについては見てきました。`State`は第3の選択肢を提供しますが、これは`Eff`モナドを使用して実装されているわけではありません。

`State`型構築子は、状態の型`s`、および返り値の型`a`という2種類の引数を取ります。「`State`モナド」というように説明はしていますが、実際には`Monad`型クラスのインスタンスが用意されているのは`State`に対してではなく、任意の型`s`についての`State s`型構築子に対してです。

`Control.Monad.State`モジュールは以下のAPIを提供しています。

```haskell
get    :: forall s.             State s s
put    :: forall s. s        -> State s Unit
modify :: forall s. (s -> s) -> State s Unit
```

これは`Ref`作用や`ST`作用が提供するAPIととてもよく似ています。しかし、これらのアクションに`RefVal`や`STRef`に渡しているような、可変領域への参照を引数に渡さないことに注意してください。`State`と`Eff`モナドが提供する解決策の違いは、`State`モナドは暗黙的な単一の状態だけを提供していることです。この状態は`State`モナドの型構築子によって隠された関数の引数として実装されており、参照は明示的には渡されないのです。

例を見てみましょう。`State`モナドの使いかたのひとつとしては、状態を数として、現在の状態に配列の値を加算していくようなものかもしれません。状態の型 `s`として`Number`を選択し、配列の走査に`traverse_`を使って、配列の要素それぞれについて`modify`を呼び出すと、これを実現することができます。

```haskell
import Data.Foldable (traverse_)
import Control.Monad.State
import Control.Monad.State.Class

sumArray :: [Number] -> State Number Unit
sumArray = traverse_ $ \n -> modify (\sum -> sum + n)
```

`Control.Monad.State`モジュールは`State`モナドでの計算を実行するための次の3つの関数を提供します。

```haskell
evalState :: forall s a. State s a -> s -> a
execState :: forall s a. State s a -> s -> s
runState  :: forall s a. State s a -> s -> Tuple a s
```

３つの関数はそれぞれ初期値の型`s`と計算の型`State s a`を引数にとります。`evalState`は返り値だけを返し、`execState`は最終的な状態だけを返し、`runState`は`Tuple a s`型の値として表現された返り値と状態の両方を返します。

先ほどの`sumArray`関数が与えられたとすると、`psci`で次のように`execState`を使うと複数の配列内の数字を合計することができます。

```text
> execState (do
    sumArray [1, 2, 3]
    sumArray [4, 5]
    sumArray [6]
  ) 0
  
21
```

> ## 演習 {-}
> 
> 1. (簡単) 上の例で、`execState`を`runState`や`evalState`で 置き換えると結果はどうなるでしょうか。
> 1. (やや難しい) `State`モナドと` traverse_`関数を使用して、次のような関数を書いてください。
> 
>     ```haskell
>     testParens :: String -> Boolean
>     ```
> 
>     これは`String`が括弧の対応が正しく付けられているかどうかを調べる関数です。この関数は次のように動作しなくてはなりません。
> 
>     ```text
>     > testParens ""
>     true
>     
>     > testParens "(()(())())"
>     true
>     
>     > testParens ")"
>     false
>     
>     > testParens "(()()"
>     false
>     ```
> 
>     **ヒント**： 入力の文字列を文字の配列に変換するのに、`Data.String`モジュールの`split`関数を使うといいかもしれません。

## Readerモナド

`purescript-transformers`パッケージでは`Reader`というモナドも提供されています。このモナドは大域的な設定を読み取る機能を提供します。`State`モナドがひとつの可変状態を読み書きする機能を提供するのに対し、`Reader`モナドはデータの読み取りの機能だけを提供します。

`Reader`型構築子は、構成の型を表す型`r`、および戻り値の型`a`の2つの型引数を取ります。

`Contro.Monad.Reader`モジュールは以下のAPIを提供します。

```haskell
ask   :: forall r. Reader r r
local :: forall r a. (r -> r) -> Reader r a -> Reader r a
```

`ask`アクションは現在の設定を読み取るために使い、`local`アクションは局所的に設定を変更して計算を実行するために使います。

たとえば、権限で制御されたアプリケーションを開発しており、現在の利用者の権限オブジェクトを保持するのに`Reader`モナドを使いたいとしましょう。型`r`を次のようなAPIを備えた型`Permission`として選択します。

```haskell
hasPermission :: String -> Permissions -> Boolean
addPermission :: String -> Permissions -> Permissions
```

利用者が特定の権限を持っているかどうかを確認したいときは、`ask`を使って現在の権限オブジェクトを取得すればいつでも調べることができます。たとえば、管理者だけが新しい利用者の作成を許可されているとしましょう。

```haskell
createUser :: Reader Permissions (Maybe User)
createUser = do
  permissions <- ask
  if hasPermission "admin" permissions
    then Just <$> newUser
    else return Nothing
```

`local`アクションを使うと、計算の実行中に`Permissionsオブジェクトを局所的に変更し、ユーザーの権限を昇格させることもできます。

```haskell
runAsAdmin :: forall a. Reader Permissions a -> Reader Permissions a
runAsAdmin = local (addPermission "admin")
```

こうすると、利用者が`admin`権限を持っていなかった場合であっても、新しい利用者を作成する関数を書くことができます。

```haskell
createUserAsAdmin :: Reader Permissions (Maybe User)
createUserAsAdmin = runAsAdmin createUser
```

`Reader`モナドの計算を実行するには、大域的な設定を与える`runReader`関数を使います。

```haskell
runReader :: forall r a. Reader r a -> r -> a
```

> ## 演習 {-}
> 
> 以下の演習では、`Reader`モナドを使って、字下げのついた文書を出力するための小さなライブラリを作っていきます。「大域的な設定」は、現在の字下げの深さを示す数になります。
>     
> ```haskell
> type Level = Number
>     
> type Doc = Reader Level String
> ```
> 
> 1. (簡単)　現在の字下げの深さで文字列を出力する関数 `line`を書いてください。その関数は、以下の型を持っている必要があります。
>     
>     ```haskell
>     line :: String -> Doc
>     ```
> 
>     **ヒント**：現在の字下げの深さを読み取るためには`ask`関数を使用します。
>     
> 1. (やや難しい) `local`関数を使用して、コードブロックの字下げの深さを大きくする次のような関数を書いてください。
> 
>     ```haskell
>     indent :: Doc -> Doc
>     ```
> 
> 1. (やや難しい) `Data.Traversable`で定義された`sequence`関数を使用して、文書のリストを改行で区切って連結する次のような関数を書いてください。
> 
>     ```haskell
>     cat :: [Doc] -> Doc
>     ```
> 
> 1. (やや難しい) `runReader`関数を使用して、文書を文字列として出力する次のような関数を書いてください。
> 
>     ```haskell
>     render :: Doc -> String
>     ```
>     
>     これで、このライブラリを次のように使うと、簡単な文書を書くことができるはずです。
> 
>     ```haskell
>     render $ cat 
>       [ line "Here is some indented text:"
>       , indent $ cat 
>           [ line "I am indented"
>           , line "So am I"
>           , indent $ line "I am even more indented"
>           ]
>       ]
>     ```
  
## Writerモナド

`Writer`モナドは、計算の返り値に加えて、もうひとつの値を累積していく機能を提供します。

よくある使い方としては型`String`もしくは`[String]`でログを累積していくというものなどがありますが、`Writer`モナドはこれよりもっと一般的なものです。これは累積するのに任意のモノイドの値を使うことができ、`Sum`モノイドを使って、合計を追跡し続けるのに使ったり、`Any`モノイドを使って途中の`Boolean`値がすべて真であるかどうかを追跡するのに使うことができます。

`Writer`型の構築子は、`Monoid`型クラスのインスタンスである型`w `、および返り値の型`a`という2つの型引数を取ります。

`Writer`のAPIで重要なのは`tell`関数です。

```haskell
tell :: forall w a. (Monoid w) => w -> Writer w Unit
```

`tell`アクションは、与えられた値を現在の累積結果に加算します。

例として、`[String]`モノイドを使用して、既存の関数にログ機能を追加してみましょう。**最大公約数**関数の以前の実装を考えてみます。

```haskell
gcd :: Number -> Number -> Number
gcd n 0 = n
gcd 0 m = m
gcd n m = if n > m 
            then gcd (n - m) m 
            else gcd n (m - n)
```

`Writer [String] Number`に返り値の型を変更することで、この関数にログ機能を追加することができます。

```haskell
import Control.Monad.Writer
import Control.Monad.Writer.Class

gcdLog :: Number -> Number -> Writer [String] Number
```

各手順で二つの入力を記録するために、少し関数を変更する必要があります。

```haskell
gcd n 0 = return n
gcd 0 m = return m
gcd n m = do
  tell ["gcd " ++ show n ++ " " ++ show m]
  if n > m 
    then gcd (n - m) m 
    else gcd n (m - n)
```

`Writer`モナドの計算を実行するには、`execWriter`関数と`runWriter`関数のいずれかを使います。

```haskell
execWriter :: forall w a. Writer w a -> w
runWriter  :: forall w a. Writer w a -> Tuple a w
```

ちょうど`State`モナドの場合と同じように、`execWriter`が累積されたログだけを返すのに対して、`runWriter`は累積されたログと結果の両方を返します。

`psci`で修正された関数を試してみましょう。

```text
> :i Data.Tuple
> :i Data.Monoid
> :i Control.Monad.Writer
> :i Control.Monad.Writer.Class

> runWriter (gcd 21 15)

Tuple 3 ["gcd 21 15","gcd 6 15","gcd 6 9","gcd 6 3","gcd 3 3"]
```

> ## 演習 {-}
> 
> 1. (やや難しい) `Writer`モナドと` purescript-monoids`パッケージの`Sum`のモノイドを使うように、上の`sumArray`関数を書き換えてください。
> 
> 1. (やや難しい)**コラッツ関数**は、自然数`n`が偶数なら`n / 2`、`n`が奇数なら`3 * n + 1`であると定義されています。たとえば、`10`で始まるコラッツ数列は次のようになります。
> 
>     ```text
>     10, 5, 16, 8, 4, 2, 1, ...
>     ```
> 
>     コラッツ関数の有限回の適用を繰り返すと、コラッツ数列は必ず最終的に`1`になるということとが予想できます。
> 
>     数列が`1`に到達するまでに何回のコラッツ関数の適用が必要かを計算する再帰的な関数を書いてください。
> 
>     コラッツ関数のそれぞれの適用のログを記録するために`Writer`モナドを使用するように関数を変更してください。

## モナド変換子

上の3つのモナド、`State`、` Reader`、 `Writer`は、いずれもいわゆる**モナド変換子**(monad transformers)の例となっています。対応するモナド変換子はそれぞれ `StateT`、` ReaderT`、`WriterT`と呼ばれています。

モナド変換子とは何でしょうか。さて、これまで見てきたように、モナドはPureScriptで適切なハンドラ(`runState`、` runReader`、 `runWriter`など)を使って解釈される、いろいろな種類の副作用でPureScriptコードを拡張します。使用する必要がある副作用が**ひとつだけ**なら、これで問題ありません。しかし、同時に複数の副作用を使用できると便利なことがよくあります。例えば、`Maybe`と` Reader`を一緒に使用すると、ある大域的な設定の文脈で**省略可能な結果**を表現することができます。もしくは、`Either`モナドの純粋なエラー追跡機能と、`State`モナドが提供する変更可能な状態が同時に欲しくなるかもしれません。この問題を解決するのが**モナド変換子**です。

**拡張可能作用**の手法を使うとネイティブな作用を混在させることができるので、`Eff`モナドはこの問題に対する部分的な解決策を提供していることをすでに見てきたことに注意してください。モナド変換子はまた異なった解決策を提供しますが、これらの手法にはそれぞれ利点と限界があります。

モナド変換子は型だけでなく別の型構築子によってもパラメータ化される型構築子です。モナド変換子はモナドをひとつ取り、独自のいろいろな副作用を追加した別のモナドへと変換します。

例を見てみましょう。`Control.Monad.State.Trans`で定義された`StateT`は`State`のモナド変換子版です。`psci`を使って`StateT`の種を見てみましょう。

```text
> :i Control.Monad.State.Trans
> :k StateT
* -> (* -> *) -> * -> *
```

とても読みにくそうに思うかもしれませんが、使い方を理解するために、`StateT`にひとつ引数を与えてみましょう。

`State`の場合、最初の型引数は使いたい状態の型です。それでは型`String`を与えてみましょう。

```text
> :k StateT String
(* -> *) -> * -> *
```

次の引数は種`* -> *`の型構築子です。これは`StateT`の機能を追加したい元のモナドを表します。例として、`Either String`モナドを選んでみます。

```text
> :k StateT String (Either String)
* -> *
```

型構築子が残りました。最後の引数は戻り値の型を表しており、たとえばそれを`Number`にすることができます。

```text
> :k StateT String (Either String) Number
*
```

最後に、種`*`の何かが残りましたが、この型の値を探してみましょう。

構築したモナド`StateT String (Either String)`は、エラーで失敗する可能性があり、変更可能な状態を使える計算を表しています。

外側の`StateT String`モナドのアクション(`get`、`put`、`modify`)は直接使うことができますが、ラップされている内側のモナド(`Either String`)の作用を使うためには、これらの関数をモナド変換子まで「持ち上げ」なくてはいけません。`Control.MonadTrans`モジュールでは、モナド変換子であるような型構築子を捕捉する`MonadTrans`型クラスを次のように定義しています。

```haskell
class MonadTrans t where
  lift :: forall m a. (Monad m) => m a -> t m a
```

このクラスは、基礎となる任意のモナド`m`の計算をとり、それをラップされたモナド`t m`へと持ち上げる、`lift`というひとつの関数だけを持っています。今回の場合、型構築子`t`は`StateT String`で、`m`は`Either String`モナドとなり、`lift`は型`Either String a`の計算を、型`State String (Either String) a`の計算へと持ち上げる方法を提供することになります。これは、型`Either String a`の計算を使うときは、`lfft`を使えばいつでも作用`StateT String`と`Either String`を隣り合わせに使うことができることを意味します。

たとえば、次の計算は`StateT`モナド変換子で導入されている状態を読み込み、状態が空の文字列である場合はエラーを投げます。

```haskell
import Data.String (drop, take)

split :: StateT String (Either String) String
split = do
  s <- get
  case s of
    "" -> lift $ Left "Empty string"
    _ -> do
      put (drop 1 s)
      return (take 1 s)
```

状態が空でなければ、この計算は`put`を使って状態を`drop 1 s`(最初の文字を取り除いた`s`)へと更新し、`take 1 s`(`s`の最初の文字)を返します。

それでは`psci`でこれを試してみましょう。

```text
> runStateT split "test"
Right (Tuple "t" "est")

> runStateT split ""
Left "Empty string"
```

これは`StateT`を使わなくても実装できるので、さほど驚くようなことではありません。しかし、モナドとして扱っているので、do記法やApplicativeコンビネータを使って、小さな計算から大きな計算を構築していくことができます。例えば、2回`split`を適用すると、文字列から最初の2文字を読むことができます。

```text
> runStateT ((++) <$> split <*> split) "test"
Right (Tuple ("te") ("st"))
```

他にもアクションを幾つか用意すれば、`split`関数を使って、基本的な構文解析ライブラリを構築することができます。これは実際に`purescript-parsing`ライブラリで採用されている手法です。これがモナド変換子の力なのです。必要な副作用を選択して、do記法とApplicativeコンビネータで表現力を維持しながら、様々な問題のための特注のモナドを作成することができるのです。

## ErrorTモナド変換子

`purescript-transformers`パッケージでは、`Either e`モナドに対応する変換子である`ErrorT e`モナド変換子も定義されています。これは次のAPIを提供します。

```haskell
class Error a where
  noMsg :: a
  strMsg :: String -> a

throwError :: forall m a. (Error e) => 
                            e -> ErrorT e m a
catchError :: forall m a. (Error e) => 
                            ErrorT e m a -> 
                            (e -> ErrorT e m a) -> 
                            ErrorT e m a
                            
runErrorT :: forall e m a. ErrorT e m a -> m (Either e a)
```

ちょうど`Either e`モナドと同じように、`throwError`アクションは失敗を示すために使われます。

`catchError`アクションを使うと、`throwError`でエラーが投げられたあとでも処理を継続することができるようになります。

`runErrorT`ハンドラを使うと、型`ErrorT e m a`の計算を実行することができます。

このAPIは`purescript-exceptions`パッケージの`Exception`作用によって提供されているものと似ています。しかし、いくつかの重要な違いがあります。

-  `ErrorT`モデルが代数的データ型を使っているのに対して、`Exception`は実際のJavaScriptの例外を使っています。
-  `ErrorT`が`Error`型クラスのどんな型のエラーでも扱うのに対して、`Exception`作用はJavaScriptの`Error`型というひとつ例外の型だけを扱います。つまり、`ErrorT`では新たなエラー型を自由に定義できます。

試しに`ErrorT`を使って`Writer`モナドを包んでみましょう。ここでもモナド変換子`ErrorT e`のアクションは自由に使えますが、`Writer`モナドの計算は`lift`を使って持ちあげなければなりません。　　

```haskell
import Control.Monad.Trans
import Control.Monad.Writer
import Control.Monad.Writer.Class
import Control.Monad.Error
import Control.Monad.Error.Class

writerAndErrorT :: ErrorT String (Writer [String]) String
writerAndErrorT = do
  tell ["Before the error"]
  throwError "Error!"
  tell ["After the error"]
  return "Return value"
```

`psci`でこの関数を試すと、ログの蓄積とエラーの送出という２つの作用がどのように相互作用しているのかを見ることができます。まず、`runErrorT`を使って外側の`ErrorT`計算を実行し、型`Write String (Either String String)`の結果を残します。それから、`runWriter`で内側の`Writer`計算を実行します。

```text
> runWriter $ runErrorT writerAndErrorT
Tuple (Left "Error!") ["Before the error"]
```

実際に追加されるログは、エラーが投げられる前に書かれたログメッセージだけであることにも注目してください。

## モナド変換子スタック

これまで見てきたように、モナド変換子を使うと既存のモナドの上に新しいモナドを構築することができます。任意のモナド変換子`t1`と任意のモナド`m`について、その適用`t1 m`もまたモナドになります。これは**ふたつめの**モナド変換子`t2`を先ほどの結果`t1 m`に適用すると、第３のモナド `t2 (t1 m)`を作れることを意味しています。このように、構成するモナドによって提供された副作用を組み合わせる、モナド変換子の**スタック**を構築することができます。

実際には、基本となるモナド`m`は、ネイティブの副作用が必要なら`Eff`モナド、さもなくば`Control.Monad.Identity`モジュールで定義されている`Identity`モナドになります。`Identity`モナドは何の新しい副作用も追加しませんから、`Identity`モナドの変換は、モナド変換子の作用だけを提供します。実際に、`State`モナド、`Reader`モナド、`Writer`モナドは、`Identity`モナドをそれぞれ`StateT`、 `ReaderT`、`WriterT`で変換することによって実装されています。

それでは3つの副作用が組み合わされている例を見てみましょう。`Identity`モナドをスタックの底にして、` StateT`作用、 `WriterT`作用、` ErrorT`作用を使います。このモナド変換子スタックは、ログの蓄積し、純粋なエラー、可変状態の副作用を提供します。

このモナド変圧器スタックを使うと、ロギングの機能が追加された`split`アクションを作ることができます。

```haskell
type Parser = StateT String (WriterT [String] (ErrorT String Identity))

split :: Parser String
split = do
  s <- get
  lift $ tell ["The state is " ++ show s]
  case s of
    "" -> lift $ lift $ throwError "Empty string"
    _ -> do
      put (drop 1 s)
      return (take 1 s)
```

この計算を`psci`で試してみると、`split`が実行されるたびに状態がログに追加されることがわかります。

モナド変換子スタックに現れる順序に従って、副作用を取り除いていかなければならないことに注意してください。最初に`StateT`型構築子を取り除くために`runStateT`を使い、それから`runtWriteT`を使い、その後`runErrorT`を使います。最後に`runIdentity`を使用して`Identity`モナドの演算を実行します。

```text
> let runParser p s = runIdentity $ runErrorT $ runWriterT $ runStateT p s

> runParser split "test"
  
Right (Tuple (Tuple "t" "est") ["The state is test"])

> runParser ((++) <$> split <*> split) "test"
  
Right (Tuple (Tuple "te" "st") ["The state is test", "The state is est"])
```

しかしながら解析が失敗した場合は、状態が空であるためログはまったく出力されません。

```text
runParser split ""
> Left "Empty string"
```

これは、`ErrorT`モナド変換子が提供する副作用が、`WriterT`モナド変換子が提供する副作用に影響を受けるためです。これはモナド変換子スタックが構成されている順序を変更することで解決することができます。スタックの最上部に`ErrorT`変換子を移動すると、先ほど`Writer`を`ErrorT`に変換したときと同じように、最初のエラーまでに書かれたすべてのメッセージが含まれるようになります。

このコードの問題のひとつは、複数のモナド変換子の上まで計算を持ち上げるために、`lift`関数を複数回使わなければならないということです。たとえば、`throwError`の呼び出しは、1回めは`WriteT`へ、2回めは`StateT`へと、2回持ちあげなければなりません。小さなモナド変換子スタックならなんとかなりますが、そのうち不便だと感じるようになるでしょう。

幸いなことに、これから見るような型クラス推論によって提供されるコードの自動生成を使うと、ほとんどの「多段持ち上げ」を行うことができます。

> ## 演習 {-}
> 
> 1. (簡単)　`Identity`関手の上の`ErrorT`モナド変換子を使って、分母がゼロの場合はエラーを投​​げる、2つの数の商を求める関数 `safeDivide`を書いてください。
> 
> 1. (やや難しい) 現在の状態が接頭辞に適合するか、エラーメッセージとともに失敗する、次のような構文解析関数を書いてください。
> 
>     ```haskell
>     string :: String -> Parser String
>     ```
> 
>     この構文解析器は次のように動作しなくてはなりません。
> 
>     ```text
>     > runParser (string "abc") "abcdef"
> 
>     Right (Tuple (Tuple "abc" "def") ["The state is abcdef"])
>     ```
> 
>     **ヒント**：出発点として`split`の実装を使うといいでしょう。
> 
> 1. (難しい) 以前`Reader`モナドを使用して書いた文書出力ライブラリを、`ReaderT`と`WriterT`モナド変圧器を使用して再実装してください。
> 
>     文字列を出力する`line`や文字列を連結する`cat`を使うのではなく、`WriteT`モナド変換子と一緒に`[String]`モノイドを使い、結果へ行を追加するのに`tell`を使ってください。

## 救済のための型クラス

章の最初で扱った`State`モナドを見てみると、`State`モナドのアクションには次のような型が与えられていました。

```haskell
get    :: forall s.             State s s
put    :: forall s. s        -> State s Unit
modify :: forall s. (s -> s) -> State s Unit
```

`Control.Monad.State.Class`モジュールで与えられている型は、実際には次のようにもっと一般的です。

```haskell
get    :: forall m s. (MonadState s m) =>             m s
put    :: forall m s. (MonadState s m) => s        -> m Unit
modify :: forall m s. (MonadState s m) => (s -> s) -> m Unit
```

`Control.Monad.State.Class`モジュールには「純粋な変更可能な状態を提供するモナド」への抽象化を可能にする`MonadState`(多変数)型クラスが定義されています。予想できると思いますが、`State s`型構築子は`MonadState s`型クラスのインスタンスになっており、このクラスには他にも興味深いインスタンスが数多くあります。

特に、`purescript-transformers`パッケージではモナド変換子`WriterT`、`ReaderT`、`ErrorT`についての`MonadState`のインスタンスが提供されています。実際に、`StateT`がモナド変換子スタックのどこかに現れ、`StateT`より上のすべてが`MonadState`のインスタンスであれば、`get`、`put`、`modify`を直接自由に使用することができます。

実は、これまで扱ってきた`ReaderT`、`WriterT`、`ErrorT`変換子についても、同じことが成り立っています。`purescript-transformers`では、それらの操作をサポートするモナドの上に抽象化することを可能にする、主な変換子それぞれについての型クラスが定義されています。

上の`split`関数の場合、構築されたこのモナドスタックは型クラス`MonadState`、`MonadWriter`、` MonadError`それぞれのインスタンスです。これはつまり、`lift`をまったく呼び出す必要がないことを意味します！まるでモナドスタック自体に定義されていたかのように、アクション `get`、` put`、 `tell`、` throwError`をそのまま使用することができます。

```haskell
split :: Parser String
split = do
  s <- get
  tell ["The state is " ++ show s]
  case s of
    "" -> throwError "Empty string"
    _ -> do
      put (drop 1 s)
      return (take 1 s)
```

この計算はまるで、可変状態、ロギング、エラー処理という３つの副作用に対応した、独自のプログラミング言語を拡張したかのようにみえます。しかしながら、内部的にはすべてはあくまで純粋な関数と普通のデータを使って実装されているのです。

## Alternative型クラス

`purescript-control`パッケージでは失敗しうる計算を操作するための抽象化がいくつか定義されています。そのひとつは `Alternative`型クラスです。

```haskell
class (Functor f) <= Alt f where
  (<|>) :: forall a. f a -> f a -> f a

class (Alt f) <= Plus f where
  empty :: forall a. f a
  
class (Applicative f, Plus f) <= Alternative f where
```

`Alternative` は、失敗しうる計算のプロトタイプを提供する `empty`値、
エラーが起きたときに**代替**(Alternative)計算へ戻ってやり直す機能を提供する`<|>`演算子 という、2つの新しいコンビネータを提供しています。

`Control.Alternative`モジュールでは`Alternative`型クラスで型構築子を操作する2つの便利な関数を提供します。

```haskell
many :: forall f a. (Alternative f, Lazy1 f) => f a -> f [a]
some :: forall f a. (Alternative f, Lazy1 f) => f a -> f [a]
``` 

`many`コンビネータは計算を**ゼロ回以上**繰り返し実行するために`Alternative`型クラスを使用しています。`some`コンビネータも似ていますが、成功するために少なくとも１回の計算を必要とします。

今回の`Parser`モナド変換子スタックの場合は、`ErrorT`コンポーネントから導かれた、明らかな方法で失敗をサポートする、`Alternative`のインスタンスが存在します。これは、構文解析器を複数回実行するために `many`関数と`some`関数を使うことができることを意味します。

```text
> :i Split
> :i Control.Alternative

> runParser (many split) "test"
  
Right (Tuple (Tuple ["t", "e", "s", "t"] "") 
             [ "The state is \"test\""
             , "The state is \"est\""
             , "The state is \"st\""
             , "The state is \"t\""
             ])
```

ここで、入力文字列`"test"`は、１文字の文字列４つの配列を返すように、繰り返し分割されています。残った状態は空文字列で、ログは`split`コンビネータが４回適用されたことを示しています。

`Alternative`型構築子の他の例としては、`Maybe`や、`[]`つまり配列の型構築子があります。

## モナド内包表記

`Control.MonadPlus`モジュールには`MonadPlus`と呼ばれる`Alternative`型クラスの若干の変形が定義されています。`MonadPlus`はモナドと`Alternative`のインスタンスの両方である型構築子を補足します。

```haskell
class (Monad m, Alternative m) <= MonadPlus m
```

実際、`Parser`モナドは`MonadPlus`のインスタンスです。

以前に本書中で配列の内包表記を扱ったとき、不要な結果をフィルタリングするため使われる`guard`関数を導入しました。実際は`guard`関数はもっと一般的で、`MonadPlus`のインスタンスであるすべてのモナドに対して使うことができます。

```haskell
guard :: forall m. (MonadPlus m) => Boolean -> m Unit
```

`<|>`演算子は失敗時のバックトラッキングをできるようにします。これがどのように役立つかを見るために、大文字だけに適合する`split`コンビネータの亜種を定義してみましょう。

```haskell
upper :: Parser String
upper = do
  s <- split
  guard $ toUpper s == s
  return s
```

ここで、文字列が大文字でない場合に失敗するよう `guard`を使用しています。このコードは前に見た配列内包表記とよく似ていることに注目してください。このように`MonadPlus`が使われており**モナド内包表記**(monad comprehensions)を構築するために参照することがあります。

## バックトラッキング

`<|>`演算子を使うと、失敗したときに別の代替計算へとバックトラックすることができます。これを確かめるために、小文字に一致するもう一つの構文解析器を定義してみましょう。

```haskell
lower :: Parser String
lower = do
  s <- split
  guard $ toLower s == s
  return s
```

これにより、まずもし最初の文字が大文字なら複数の大文字に適合し、さもなくばもし最初の文字が小文字なら複数の小文字に適合する、という構文解析器を定義することができます。

```text
> let upperOrLower = some upper <|> some lower
```

この構文解析器は、大文字と小文字が切り替わるまで、文字に適合し続けます。

```text
> runParser upperOrLower "abcDEF"

Right (Tuple (Tuple ["a","b","c"] ("DEF")) 
             [ "The state is \"abcDEF\"",
             , "The state is \"bcDEF\""
             , "The state is \"cDEF\""
             ])
```

`many`を使うと、文字列を小文字と大文字の要素に完全に分割することもできます。

```text
> let components = many upperOrLower

> runParser components "abCDeFgh"
  
Right (Tuple (Tuple [["a","b"],["C","D"],["e"],["F"],["g","h"]] "") 
             [ "The state is \"abCDeFgh\""
             , "The state is \"bCDeFgh\""
             , "The state is \"CDeFgh\""
             , "The state is \"DeFgh\""
             , "The state is \"eFgh\""
             , "The state is \"Fgh\""
             , "The state is \"gh\""
             , "The state is \"h\""
             ])
```

繰り返しになりますが、これはモナド変換子がもたらす再利用性の威力を示しています。標準的な抽象化を再利用することで、バックトラック構文解析器を宣言型のスタイルでわずか数行のコードで書くことができました！

> ## 演習 {-}
> 
> 1. (簡単) `string`構文解析器の実装から`lift`関数の呼び出しを取り除いてください。新しい実装の型が整合していることを確認し、そうでなることをよく納得しておきましょう。
> 
> 1. (やや難しい) `string`構文解析器と`many`コンビネータを使って、文字列`"a"`の連続と、それに続く文字列`"b"`の連続からなる文字列を認識する構文解析器を書いてください。
> 
> 1. (やや難しい) `<|>`演算子を使って、文字`a`と文字`b`が任意の順序で現れるような文字列を認識する構文解析器を書いてください。
> 
> 1. (難しい) `Parser`モナドは次のように定義されるかもしれません。
> 
>     ```haskell
>     type Parser = ErrorT String (StateT String (WriterT [String] Identity))
>     ```
> 
>     このように変更すると、構文解析関数にどのような影響を与えるでしょうか。

## RWSモナド

モナド変換子のある特定の組み合わせは、`purescript-transformers`パッケージ内の単一のモナド変換子として提供されるのが一般的です。`Reader`、` Writer`、`State`のモナドは、**Reader-Writer-State**モナド(`RWS`モナド)へと結合されます。このモナドは `RWST`モナド変換子と呼ばれる、対応するモナド変換子を持っています。

ここでは`RWS`モナドを使ってテキストアドベンチャーゲームの処理を設計していきます。

`RWS`モナドは(戻り値の型に加えて)3つの型変数で定義されています。

```haskell
type RWS r w s = RWST r w s Identity
```

副作用を提供しない`Identity`にベースモナドを設定することで、`RWS`モナドが独自のモナド変換子の観点から定義されていることに注意してください。

第1型引数`r`は大域的な設定の型を表します。第2型引数`w`はログを蓄積するために使用するモノイド、第3型引数`s`は可変状態の型を表しています。

このゲームの場合には、大域的な設定は`Data.GameEnvironment`モジュールの`GameEnvironment`と呼ばれる型で定義されています。

```haskell
type PlayerName = String

newtype GameEnvironment = GameEnvironment
  { playerName    :: PlayerName
  , debugMode     :: Boolean
  }
```

`GameEnvironment`では、プレイヤー名と、ゲームがデバッグモードで動作しているか否かを示すフラグが定義されています。これらのオプションは、モナド変換子を実行するときにコマンドラインから設定されます。

可変状態は`Data.GameState`モジュールの`GameState`と呼ばれる型で定義されています。

```haskell
import qualified Data.Map as M
import qualified Data.Set as S

newtype GameState = GameState
  { items       :: M.Map Coords (S.Set GameItem)
  , player      :: Coords
  , inventory   :: S.Set GameItem
  }
```

`Coords`データ型は2次元平面の点を表し、`GameItem`データ型はゲーム内のアイテムです。

```haskell
data GameItem = Candle | Matches
```

`GameState`型はソートされたマップを表す`Map`とソートされた集合を表す`Set`という2つの新しいデータ構造を使っています。`items`プロパティは、そのゲーム平面上の座標と、ゲームアイテムの集合へのマッピングになっています。`player`プロパティはプレイヤーの現在の座標を格納しており、`inventory`プロパティは現在プレイヤーが保有するゲームアイテムの集合です。

`Map`と`Set`のデータ構造は平衡2-3木を使って実装されており、`Ord`型クラス内の任意の型をキーとして使用することができます。これは今回のデータ構造のキーが完全に順序付けできることを意味します。

ゲームのアクションを書くために、`Map`と`Set`構造がどのように使っていくのかを見ていきましょう。

ログとしては`[String]`モノイドを使います。`RWS`を使って`Game`モナドのための型同義語を定義しておきます。

```haskell
type Log = [String]

type Game = RWS GameEnvironment Log GameState
```

## ゲームロジックの実装

今回は、`Reader`モナド、`Writer`モナド、`State`モナドのアクションを再利用し、`Game`モナドで定義されている単純なアクションを組み合わせてゲームを構築していきます。このアプリケーションの最上位では、`Game`モナドで純粋な計算を実行しており、`Eff`モナドはコンソールにテキストを出力するような追跡可能な副作用へと結果を変換するために使っています。

このゲームで最も簡単なアクションのひとつは`has`アクションです。このアクションはプレイヤーの持ち物に特定のゲームアイテムが含まれているかどうかを調べます。これは次のように定義されます。

```haskell
has :: GameItem -> Game Boolean
has item = do
  GameState state <- get
  return $ item `S.member` state.inventory
```

この関数は、現在のゲームの状態を読み取るために`Monad.State`型クラスで定義されている`get`アクションを使っており、指定した`GameItem`が持ち物の`Set`のなかに出現するかどうかを調べるために`Data.Set`で定義されている`member`関数を使っています。

他にも`pickUp`アクションがあります。現在の位置にゲームアイテムがある場合、プレイヤーの持ち物にそのアイテムを追加します。これには`MonadWriter`と`MonadState`型クラスのアクションを使っています。まず、現在のゲームの状態を読み取ります。

```haskell
pickUp :: GameItem -> Game Unit
pickUp item = do
  GameState state <- get
```

次に`pickUp`は現在の位置にあるアイテムの集合を検索します。これは`Data.Map`で定義された `lookup`関数を使って行います。

```haskell
  case state.player `M.lookup` state.items of
```

`lookup`関数は`Maybe`型構築子で示されたオプショナルな結果を返します。`lookup`関数は、キーがマップにない場合は`Nothing`を返し、それ以外の場合は`Just`構築子で対応する値を返します。 

関心があるのは、指定されたゲームアイテムが対応するアイテムの集合に含まれている場合です。`member`関数を使うとこれを調べることができます。

```haskell
    Just items | item `S.member` items -> do
```

この場合、`put`を使ってゲームの状態を更新し、`tell`を使ってログにメッセージを追加します。

```haskell
      let newItems = M.update (Just <<< S.delete item) state.player state.items
          newInventory = S.insert item state.inventory
      put $ GameState state { items     = newItems
                            , inventory = newInventory
                            }
      tell ["You now have the " ++ show item]
```

ここで、`MonadState`と`MonadWriter`の両方について`Game`モナド変換子スタックについての適切なインスタンスが存在するので、２つの計算はどちらも`lift`は必要ないことに注意してください。

`put`の引数では、レコード更新を使ってゲームの状態の`items`と`inventory`フィールドを変更しています。特定のキーの値を変更するには`Data.Map`の`update`関数を使います。このとき、`delete`関数を使い指定したアイテムを集合から取り除くことで、
プレイヤーの現在の位置にあるアイテムの集合を変更します。

最後に、`pickUp`関数は`tell`を使ってユーザに次のように通知することにより、残りの場合を処理します。

```haskell
    _ -> tell ["I don't see that item here."]
```

`Reader`モナドを使う例として、`debug`コマンドのコードを見てみましょう。ゲームがデバッグモードで実行されている場合、このコマンドを使うとユーザは実行時にゲームの状態を調べることができます。

```haskell
  GameEnvironment env <- ask
  if env.debugMode
    then do
      state <- get
      tell [show state]
    else tell ["Not running in debug mode."] 
```

ここでは、ゲームの設定を読み込むために`ask`アクションを使用しています。繰り返しますが、どんな計算の`lift`も必要なく、同じdo記法ブロック内で`MonadState`、`MonadReader`、` MonadWriter`型クラスで定義されているアクションを使うことができることに注意してください。

`debugMode`フラグが設定されている場合、`tell`アクションを使ってログに状態が追加されます。そうでなければ、エラーメッセージが追加されます。

`Game.purs`モジュールでは、`MonadState`型クラス、`MonadReader`型クラス、`MonadWriter`型クラスでそれぞれ定義されたアクションだけを使って、同様のアクションが定義されています。

## 計算の実行

このゲームロジックは`RWS`モナドで動くため、ユーザのコマンドに応答するためには計算を実行する必要があります。

このゲームのフロントエンドは、`yargs`コマンドライン構文解析ライブラリへのApplicativeなインターフェイスを提供する`purescript-yargs`パッケージと、対話的なコンソールベースのアプリケーションを書くことを可能にするNodeJSの`readline`モジュールをラップする`purescript-node-readline`パッケージという２つのパッケージで構成されています。

このゲームロジックへのインタフェースは`Game`モジュール内の関数`game`によって提供されます。

```haskell
game :: [String] -> Game Unit
```

この計算を実行するには、ユーザが入力した単語のリストを文字列の配列として渡してから、`runRWS`を使って`RWS`の計算を実行します。

```haskell
type See s a w = { log :: w, result :: a, state :: s }

runRWS :: forall r w s a. RWS r w s a -> r -> s -> See s a w
```

`runRWS`は`runReader`、`runWriter`、`runState`を組み合わせたように見えます。これは、引数として大域的な設定および初期状態をとり、ログ、結果、最的な終状態を含むレコードを返します。

このアプリケーションのフロントエンドは、次の型シグネチャを持つ関数 `runGame`によって定義されます。

```haskell
runGame :: GameEnvironment -> Eff (console :: Console, trace :: Trace) Unit
```

`Console`作用は、この関数が`purescript-node-readline`パッケージを使ってコンソールを介してユーザと対話することを示しています。`runGame`は関数の引数としてのゲームの設定とります。

`purescript-node-readline`パッケージでは、端末からのユーザ入力を扱う`Eff`モナドのアクションを表す`LineHandler`型が提供されています。対応するAPIは次のとおりです。

```haskell
type LineHandler eff = String -> Eff eff Unit

setLineHandler :: forall eff. LineHandler eff -> 
                              Interface -> 
                              Eff (console :: Console | eff) Interface
```

`Interface`型はコンソールのハンドルを表しており、コンソールと対話する関数への引数として渡されます。`createInterface`関数を使用すると`Interface`を作成することができます。

```haskell
runGame env = do
  interface <- createInterface process.stdin process.stdout noCompletion
```

最初の手順はコンソールにプロンプトを設定することです。`interface`ハンドルを渡し、プロンプト文字列とインデントレベルを提供します。

```haskell
setPrompt "> " 2 interface
```

今回の場合、ラインハンドラ関数を実装することに関心があります。ラインハンドラは`let`宣言内の補助関数を使って次のように定義されています。

```haskell
lineHandler :: GameState -> String -> Eff (console :: Console, trace :: Trace) Unit
lineHandler currentState input = do
  let result = runRWS (game (split " " input)) env currentState
  foreachE result.log trace
  setLineHandler (lineHandler result.state) interface
  prompt interface
  return unit
```

`lineHandler`では`env`という名前のゲーム構成や、`interface`という名前のコンソールハンドルを参照しています。

このハンドラは追加の最初の引数としてゲームの状態を取ります。ゲームのロジックを実行するために`runRWS`にゲームの状態を渡さなければならないので、これは必要となっています。

このアクションが最初に行うことは、`Data.String`モジュールの`split`関数を使用して、ユーザーの入力を単語に分割することです。それから、ゲーム環境と現在のゲームの状態を渡し、`runRWS`を使用して(`RWS`モナドで)`game`アクションを実行しています。

純粋な計算であるゲームロジックを実行し、画面にすべてのログメッセージを出力して、ユーザに次のコマンドのプロンプトを表示する必要があります。`foreachE`アクションは(`[String]`型の)ログを走査し、コンソールにその内容を出力するために使われています。そして`setLineHandler`を使ってラインハンドラ関数を更新することで、ゲームの状態を更新します。最後に`prompt`アクションを使ってプロンプトが再び表示しています。

`runGame`関数ではコンソールインターフェイスに最初のラインハンドラを設定して、最初のプロンプトを表示します。

```haskell
  setLineHandler (lineHandler initialGameState) interface
  prompt interface
```

> ## 演習 {-}
> 
> 1. (やや難しい) ゲームフィールド上にあるすべてのゲームアイテムをユーザの持ちものに移動する新しいコマンド`cheat`を実装してください。
> 
> 1. (難しい) 今のところ`WriteT`モナド変換子は、エラーメッセージと情報メッセージの２つの種類のメッセージのために使われています。このため、コードのいくつかの箇所では、エラーの場合を扱うためにcase式を使用しています。
> 
>     エラーメッセージを扱うのに`ErrorT`モナド変換子を使い、情報メッセージを扱うのに`WriteT`を使うように、コードをリファクタリングしてください。

## コマンドラインオプションの扱い

このアプリケーションの最後の部品は、コマンドラインオプションの解析と`GameEnvironment`レコードを作成する役目にあります。このためには`purescript-yargs`パッケージを使用します。

`purescript-yargs`は**Applicativeなコマンドラインオプション構文解析器**の例です。Applicative関手を使うと、いろいろな副作用の型を表す型構築子まで任意個数の引数の関数をを持ち上げられることを思い出してください。`purescript-yargs`パッケージの場合には、コマンドラインオプションからの読み取りの副作用を追加する`Y`関手が興味深い関手になっています。これは次のようなハンドラを提供しています。

```haskell
runY :: forall a eff. YargsSetup -> 
                      Y (Eff eff a) -> 
                      Eff (console :: Console, err :: Exception | eff) a
```

この関数の使いかたは、例で示すのが最も適しているでしょう。このアプリケーションの`main`関数は`runY`を使って次のように定義されています。

```haskell
main = runY (usage "$0 -p <player name>") $ runGame <$> env
```

最初の引数は`yargs`ライブラリを設定するために使用されます。今回の場合、使用方法のメッセージだけを提供していますが、`Node.Yargs.Setup`モジュールには他にもいくつかのオプションを提供しています。

2番目の引数では、`Y`型構築子まで`runGame`関数を持ち上げるために`<$>`コンビネータを使用しています。引数`env`は`where`節でApplicative演算子`<$>`、`<*>`を使って構築されています。

```haskell
  where
  env :: Y GameEnvironment
  env = gameEnvironment
          <$> yarg "p" ["player"] 
                   (Just "Player name") 
                   (Right "The player name is required") 
                   false
          <*> flag "d" ["debug"]
                   (Just "Use debug mode")
```

`PlayerName -> Boolean -> GameEnvironment`という型を持つこの`gameEnvironment`関数は、`Y`まで持ち上げられています。このふたつの引数は、コマンドラインオプションからプレイヤー名とデバッグフラグを読み取る方法を指定しています。最初の引数は`-p`もしくは`--player`オプションで指定されるプレイヤー名オプションについて記述しており、２つ目の引数は`-d`もしくは`--debug`オプションで指定されるデバッグモードフラグについて記述しています。

これは `Node.Yargs.Applicative`モジュールで定義されているふたつの基本的な関数について示しています。`yarg`は(型`String`、`Number`、`Boolean`の)オプショナルな引数を取りコマンドラインオプションを定義し、`flag`は型`Boolean`のコマンドラインフラグを定義しています。

Applicative演算子によるこの記法を使うことで、コマンドラインインターフェイスに対してコンパクトで宣言的な仕様を与えることが可能になったことに注意してください。また、`env`の定義で`runGame`関数に新しい引数を追加し、`<*>`を使って追加の引数まで`runGame`を持ち上げるだけで、簡単に新しいコマンドライン引数を追加することができます。

> ## 演習 {-}
> 
> 1. (やや難しい) `GameEnvironment`レコードに新しい真偽値のプロパティ`cheatMode`を追加してください。 また、`yargs`設定に、チートモードを有効にする新しいコマンドラインフラグ`-c`を追加してください。チートモードが有効になっていない場合、`cheat`コマンドは禁止されなければなりません。

## まとめ

モナド変換子を使用したゲームの純粋な定義、コンソールを使用したフロントエンドを構築するための`Eff`モナドなと、この章ではこれまで学んできた手法を実用的に使いました。

ユーザインターフェースからの実装を分離したので、ゲームの別のフロントエンドを作成することも可能でしょう。例えば、`Eff`モナドでCanvas APIやDOMを使用して、ブラウザでゲームを描画するようなことができるでしょう。

モナド変換子によって、型システムによって作用が追跡される命令型のスタイルで、安全なコードを書くことができることを見てきました。また、型クラスは、コードの再利用を可能にするモナドによって提供される、アクション上の抽象化の強力な方法を提供します。標準的なモナド変換子を組み合わせることにより、`Alternative`や`MonadPlus`のような標準的な抽象化を使用して、役に立つモナドを構築することができました。

モナド変換子は、高階多相や多変数型クラスなどの高度な型システムの機能を利用することによって記述することができ、表現力の高いコードの優れた実演となっています。

次の章では、非同期なJavaScriptのコードにありがちな不満、**コールバック地獄**の問題に対して、モナド変換子がどのような洗練された解決策を与えるのかを見ていきます。

