# Effモナド

## この章の目標

第7章では、オプショナルな型やエラーメッセージ、データの検証など、**副作用**を扱いを抽象化するApplicative関手を導入しました。この章では、より表現力の高い方法で副作用を扱うための別の抽象化、**モナド**を導入します。

この章の目的は、なぜモナドが便利な抽象化なのか、**do記法**とどう関係するのかについて説明することです。ブラウザでユーザインターフェイスを構築する副作用を扱うためのある種のモナドを使って、前の章の住所録の例を作ることにしましょう。これから扱うEffモナドは、PureScriptにおけるとても重要なモナドです。Effモナドはいわゆる**ネイティブな**作用をカプセル化するのに使われます。

## プロジェクトの準備

このプロジェクトのソースコードは前の章のソースコードの上に構築しますが、そのソースファイルを含めるようにGruntビルドスクリプトを使用しています。

コー​​ドは3つのモジュールに分かれています。

- `Main` - アプリケーションへのエントリポイントを提供します。
- `Data.AddressBook.UI` - ブラウザのユーザインターフェースをレンダリングするための関数を提供します。
- `Control.Monad.Eff.DOM` - DOMを操作する関数の簡単なライブラリを提供します。

このプロジェクトを実行するには、Gruntでビルドし、`html/index.html`ファイルをウェブブラウザで開いてください。

## モナドとdo記法

do記法は**配列内包表記**を扱うときに最初に導入されました。配列内包表記は `Data.Array`モジュールの`concatMap`関数の構文糖として提供されています。

次の例を考えてみましょう。２つのサイコロを振って出た目を数え、出た目の合計が`n`のときそれを得点とすることを考えます。次のような非決定的なアルゴリズムを使うとこれを実現することができます。

- 最初の投擲で値`x`を**選択**します
- ２回め投擲で値`y`を**選択**します
- もし`x`と `y`の和が`n`なら組`{x, y}`を返し、そうでなければ失敗します

配列内包表記を使うと、この非決定的アルゴリズムを自然に書くことができます。

```haskell
countThrows :: Number -> [[Number]]
countThrows n = do
  x <- range 1 6
  y <- range 1 6
  if x + y == n then return [x, y] else empty
```

`psci`で動作を見てみましょう。

```text
> countThrows 10
[[4,6],[5,5],[6,4]]

> countThrows 12  
[[6,6]]
```

前の章では、**オプショナルな値**に対応したより大きなプログラミング言語へとPureScriptの関数を埋め込む、`Maybe`Applicative関手についての直感的理解を養いました。同様に**配列モナド**についても、**非決定選択**に対応したより大きなプログラミング言語へPureScriptの関数を埋め込む、というような直感的理解を得ることができます。

一般に、ある型構築子`m`のモナドは、型`m a`の値を持つdo記法を使う方法を提供します。上の配列内包表記では、すべての行に何らかの型`a`についての型`[a]`の計算が含まれていることに注目してください。一般に、do記法ブロックのすべての行は、何らかの型`a`とモナド`m`について、型`m a`の計算を含んでいます。モナド`m`はすべての行で同じでなければなりません(つまり、副作用の種類は固定されます)が、型`a`は異なることもあります(言い換えると、ここの計算は異なる型の結果を持つことができます)。

型構築子`Maybe`が適用された、do記法の別の例を見てみましょう。XMLノードを表す型`XML`と演算子があるとします。

```haskell
(</>) :: XML -> String -> Maybe XML
```

この演算子はノードの子の要素を探し、もしそのような要素が存在しなければ`Nothing`を返します。

この場合、do記法を使うと深い入れ子になった要素を検索することができます。XML文書として符号化された利用者情報から、利用者の住んでいる市町村を読み取りたいとします。

```haskell
userCity :: XML -> Maybe XML
userCity root = do
  prof <- root </> "profile"
  addr <- prof </> "address"
  city <- addr </> "city"
  return city
``` 

`userCity`関数は子の要素である`profile`を探し、`profile`要素の中にある`address`要素、最後に`address`要素から`city`要素を探します。これらの要素のいずれかが欠落している場合は、返り値は`Nothing`になります。そうでなければ、返り値は `city`ノードから` Just`を使って構築されています。

最後の行の `return`関数は予約語ではないことを思い出してください。`return`は実際にすべての `Applicative`関手について定義されている`pure`関数の別名です。JavaScriptのreturn文を連想するかもしれませんが、関数の途中での復帰とはまったく関係がありません。最後の行を`Just city`へ変更しても同じように正しく動きます。

## モナド型クラス

`Monad`型クラスは次のように定義されています。

```haskell
class (Apply m) <= Bind m where
  (>>=) :: forall a b. m a -> (a -> m b) -> m b

class (Applicative m, Bind m) <= Monad m
```

ここで鍵となる関数は`Bind`型クラスで定義されている演算子`=>>`で、これは「束縛」(bind)と呼ばれています。`Monad`型クラスは、すでに見てきた`Applicative`型クラスの操作で`Bind`を拡張します。

`Bind`型クラスの例をいくつか見てみるのがわかりやすいでしょう。配列についての`Bind`の妥当な定義は次のようになります。

```haskell
instance bindArray :: Bind [] where
  (>>=) xs f = f `concatMap` xs
```

これは以前にほのめかした配列内包表記と`concatMap`関数の関係を説明しています。

`Maybe`型構築子についての`Bind`の実装は次のようになります。

```haskell
instance bindMaybe :: Bind Maybe where
  (>>=) Nothing  _ = Nothing
  (>>=) (Just a) f = f a
```

この定義はdo記法ブロックを通じて伝播された欠落した値についての直感的理解を補強するものです。

`Bind`型クラスとdo記法がどのように関係しているかを見て行きましょう。最初に何らかの計算結果から値を束縛するような、簡単などdo記法ブロックについて考えてみましょう。

```haskell
do value <- someComputation
   whatToDoNext
```

PureScriptコンパイラはこのようなパターンを見つけるたびにコードを次にように置き換えます。

```haskell
someComputation >>= \value -> whatToDoNext
```

この計算`whatToDoNext`は`value`に依存することができます。

連続した複数の束縛がある場合でも、この規則が先頭のほうから複数回適用されます。例えば、先ほど見た`userCity`の例では次のように構文糖が脱糖されます。

```haskell
userCity :: XML -> Maybe XML
userCity root = 
  root </> "profile" >>= \prof ->
    prof </> "address" >>= \addr ->
      addr </> "city" >>= \city ->
        return city
```

do記法を使って表現されたコードは、`>>=`演算子を使って書かれた同じ意味のコードよりしばしば読みやすくなることも特筆すべき点です。一方で、明示的に`>>=`を使って束縛が書くと、**point-free**形式でコードを書く機会を増やすことになります。ただし、通常は読みやすさを優先すべきでしょう。

## モナド則

`Monad`型クラスは**モナド則**(monad laws)と呼ばれる3つの規則を持っています。これらは`Monad`型クラスの理にかなった実装から何を期待できるかを教えてくれます。

do記法を使用してこれらの規則を説明していくのが最も簡単でしょう。

### Identity律

**右単位元則**(right-identity law)が３つの規則の中で最も簡単です。この規則はdo記法ブロックの最後の式であれば、`return`の呼び出しを排除することが
できると言っています。

```haskell
do 
  x <- expr
  return x
```

右単位元則は、この式は単なる`expr`と同じだと言っています。

**左単位元則**(left-identity law)は、もしそれがdo記法ブロックの最初の式であれば、`return`の呼び出しを除去することができると述べています。

```haskell
do 
  x <- return y
  next
``` 

このコードの名前`x`を式`y`で置き換えたものと`next`は同じです。

最後の規則は**結合則**(associativity law)です。これは入れ子になったdo記法ブロックをどう扱うのかについて教えてくれます。

```haskell
c1 = do 
  y <- do 
    x <- m1
    m2
  m3
```

上記のコード片は、次のコードと同じです。

```haskell  
c2 = do 
  x <- m1
  y <- m2
  m3
```

これら計算にはそれぞれ、3つのモナドの式 `m1`、` m2`、 `m3`が含まれています。どちらの場合でも`m1` の結果は名前 `x`に束縛され、`m2`の結果は名前 `y`に束縛されます。

`c1`では２つの式`m1`と`m2`がそれぞれのdo記法ブロック内にグループ化されています。

`c2`では`m1`、`m2`、`m3`の３つすべての式が同じdo記法ブロックに現れています。

結合規則は　入れ子になったdo記法ブロックをこのように単純化しても安全であるということを言っています。

**注意**: do記法がどのように`>>=`の呼び出しへと脱糖されるかの定義により、`c1`と`c2`はいずれも次のコードと同じです。`

```haskell
c3 = do 
  x <- m1
  do
    y <- m2
    m3
```

## モナドと畳み込み

抽象的にモナドを扱う例として、この節では`Monad`型クラスの何らかの型構築子と一緒に機能するある関数を示していきます。これはモナドによるコードが副作用を伴う「より大きな言語」でのプログラミングと対応しているという直感的理解を補強しますし、モナドによるプログラミングがもたらす一般性も示しています。

これから`foldM`と呼ばれる関数を書いてみます。これは以前扱った`foldl`関数をモナドの文脈へと一般化します。型シグネチャは次のようになっています。

```haskell
foldM :: forall m a b. (Monad m) => (a -> b -> m a) -> a -> [b] -> m a 
```

モナド`m`が現れている点を除いて、`foldl`の型と同じであることに注意しましょう。

```haskell
foldl :: forall a b. (a -> b -> a) -> a -> [b] -> a
```

直感的には、`foldM`はさまざまな副作用の組み合わせに対応した文脈での配列の畳み込みを行うと捉えることができます。

例として`m`が`Maybe`であるとすると、この畳み込みはそれぞれの段階で`Nothing`を返すことで失敗することができます。それぞれの段階ではオプショナルな結果を返しますから、それゆえ畳み込みの結果もオプショナルになります。

もし`m`として配列の型構築子`[]`を選ぶとすると、畳み込みのそれぞれの段階で複数の結果を返すことができ、畳み込みは結果それぞれに対して次の手順を継続します。最後に、結果の集まりは、可能な経路すべての畳み込みから構成されることになります。これはグラフの走査と対応しています！

`foldM`を書くには、単に入力の配列について場合分けをするだけです。

配列が空なら、型`a`の結果を生成するための選択肢はひとつしかありません。第２引数を返します。

```haskell
foldM _ a [] = return a
```

`a`をモナド`m`まで持ち上げるために`return`を使わなくてはいけないことも忘れないようにしてください。

配列が空でない場合はどうでしょうか？その場合、型`a`の値、型`b`の値、型`a -> b -> m a`の関数があります。もしこの関数を適用すると、型`m a`のモナドの結果を手に入れることになります。この計算の結果を逆向きの矢印`<-`で束縛することができます。

あとは配列の残りに対して再帰するだけです。実装は簡単です。

```haskell
foldM f a (b : bs) = do
  a' <- f a b
  foldM f a' bs
```

do記法を除けば、この実装は配列に対する`foldl`の実装とほとんど同じであることにも注意してください。

`psci`でこれを定義し、試してみましょう。除算可能かどうかを調べて、失敗を示すために`Maybe`型構築子を使う、整数の「安全な除算」関数を定義するとしましょう。

```haskell
safeDivide :: Number -> Number -> Maybe Number
safeDivide a b | a % b == 0 = Just (a / b)
safeDivide _ _ = Nothing
```
  
これで、`foldM`で安全な除算の繰り返しを表現することができます。
  
```text
> foldM safeDivide 100 [5, 2, 2]
Just (5)

> foldM safeDivide 100 [2, 3, 4]
Nothing
```

もしいずれかの時点で整数にならない除算が行われようとしたら、`foldM safeDivide`関数は`Nothing`を返します。そうでなければ、`Just`構築子に包まれた除算の繰り返した累積の結果を返します。

## モナドとApplicative

クラス間に上位クラス関係があるため、`Monad`型クラスのすべてのインスタンスは`Applicative`型クラスのインスタンスでもあります。

しかしながら、どんな`Monad`のインスタンスについても`Applicative`型クラスの実装が、それ以上の条件なしで存在し、次のような`ap`が与えられます。

```haskell
ap :: forall m. (Monad m) => m (a -> b) -> m a -> m b
ap mf ma = do
  f <- mf
  a <- ma
  return (f a)
```

もし`m`が`Monad`型クラスの規則に従っているなら、`pure`が`return`で与えられ、`<*>`が`ap`で与えられるような、妥当な`Applicative`インスタンスが存在します。　　　　

興味のある読者は、これまで登場した`[]`、`Maybe`、`Either e`、`V e`といったモナドについて、この`ap`が`<*>`と一致することを確かめてみてください。

もしすべてのモナドがApplicative関手でもあるなら、Applicative関手についての直感的理解をすべてのモナドについても適用することができるはずです。特に、更なる副作用の組み合わせで増強された「より大きな言語」でのプログラミングとモナドがいろいろな意味で一致することを当然に期待することができます。`<$>`と`<*>`を使って、引数が任意個の関数をこの新しい言語へと持ち上げることができるはずです。

しかし、モナドはApplicative関手で可能な以上のことを行うことができ、重要な違いはdo記法の構文で強調されています。利用者情報を符号化したXML文書から利用者の都市を検索する、`userCity`の例についてもう一度考えてみましょう。

```haskell
userCity :: XML -> Maybe XML
userCity root = do
  prof <- root </> "profile"
  addr <- prof </> "address"
  city <- addr </> "city"
  return city
```

２番目の計算が最初の結果`prof`に依存し、３番目の計算が２番目の計算の結果`addr`に依存するというようなことをdo記法は可能にします。`Applicative`型クラスのインターフェイスだけを使うのでは、このような以前の値への依存は不可能です。

`pure`と`<*>`だけを使って`userCity`を書こうとしてみれば、これが不可能であることがわかるでしょう。Applicativeは関数の互いに独立した引数を持ち上げることだけを可能にしますが、モナドはもっと興味深いデータ依存関係に関わる計算を書くことを可能にします。

前の章では`Applicative`型クラスは並列処理を表現できることを見ました。持ち上げられた関数の引数は互いに独立していますから、これはまさにその通りです。`Monad`型クラスは計算が前の計算の結果に依存できるようにしますから、同じようにはなりません。モナドはその副作用を順番に組み合わせしなければいけません。

> ## 演習 {-}
> 
> 1. （簡単）　`purescript-arrays`パッケージの`Data.Array`モジュールから`head`関数と`tail`関数の型を探してください。`Maybe`モナドとdo記法を使い、`head`と`tail`を組み合わせて、３要素以上の配列の3番目の要素を返すような関数を作ってください。その関数は適当な`Maybe`型を返さなければいけません。
> 1. （やや難しい） 与えられた幾つかの硬貨を組み合わせてできる可能性のあるすべての合計を決定する関数`sum`を、`foldM`を使って書いてみましょう。入力の硬貨は、硬貨の価値の配列として与えられます。この関数は次のような結果にならなくてはいけません。
> 
>     ```text
>     > sums []
>     [0]
> 
>     > sums [1, 2, 10]
>     [0,1,2,3,10,11,12,13]
>     ```
> 
>     **ヒント**：`foldM`を使うと１行でこの関数を書くことが可能です。重複する要素を取り除いたり、結果を昇順に並び替えたりするのに、`nub`関数や`sort`関数を使いたくなるかもしれません。
>     
> 1. （やや難しい） `Maybe`型構築子について、`ap`関数と`<*>`演算子が一致することを確認してください。
> 
> 1. （やや難しい） `purescript-maybe`パッケージで定義されている`Maybe`型についての`Monad`インスタンスが、モナド則を満たしていることを検証してください。
> 
> 1. （やや難しい） 配列上の`filter`の関数を一般化した関数` filterM`を書いてください。この関数は次の型シグネチャを持つ必要があります。
> 
>     ```haskell
>     filterM :: forall m a. (Monad m) => (a -> m Boolean) -> [a] -> m [a]
>     ```
> 
>     `psci`で`Maybe`と`[]`モナドを使ってその関数を試してみてください。
>     
> 1. （難しい） すべてのモナドは、次で与えられるような既定の`Functor`インスタンスがあります。
> 
>     ```haskell
>     (<$>) f a = do
>       x <- a
>       return (f a)
>     ```
> 
>     モナド則を使って、すべてのモナドが次を満たすことを証明してください。
> 
>     ```haskell
>     lift2 f (return a) (return b) = return (f a b)
>     ```
>     
>     ここで、 `Applicative`インスタンスは上で定義された` ap`関数を使用しています。`lift2`が次のように定義されていたことを思い出してください。
> 
>     ```haskell
>     lift2 :: forall f a b c. (Applicative f). (a -> b -> c) -> f a -> f b -> f c
>     lift2 f a b = f <$> a <*> b
>     ```

## ネイティブな作用

ここではPureScriptの中核となる重要なモナド、`Eff`モナドについて見ていきます。

`Eff`モナドは`Control.Monad.Eff`モジュール、およびPreludeで定義されています。これはいわゆる**ネイティブな作用**を扱うために使います。

ネイティブな副作用とは何でしょうか。ネイティブな副作用とは、従来のJavaScriptの式が持つ副作用と、PureScript特有の式が持つ副作用を区別するものです。ネイティブな作用には次のようなものがあります。

- コンソール入出力
- 乱数生成
- 例外
- 変更可能な状態の読み書き

また、ブラウザでは次のようなものがあります。

- DOM操作
- XMLHttpRequest / AJAX呼び出し
- WebSocketによる相互作用
- Local Storageの読み書き

すでに「ネイティブでない」副作用の例については数多く見てきています。

- `Maybe`データ型で表現される省略可能な値
- `Either`データ型で表現されるエラー
- 配列やリストで表現される多価関数

これらの区別はわかりにくいので注意してください。エラーメッセージは例外の形でJavaScriptの式の副作用となることがあります。その意味では例外はネイティブな副作用を表していて、`Eff`を使用して表現することができます。しかし、`Either`を使用して実装されたエラーメッセージはJavaScriptランタイムの副作用ではなく、`Eff`を使うスタイルでエラーメッセージを実装するのは適切ではありません。そのため、ネイティブなのは作用自体というより、実行時にどのように実装されているかです。

## 副作用と純粋性

PureScriptのような言語が純粋であるとすると、疑問が浮かんできます。副作用がないなら、どうやって役に立つ実際のコードを書くことができるというのでしょうか。

その答えはPureScriptの目的は副作用を排除することではないということです。これは、純粋な計算と副作用のある計算とを型システムにおいて区別することができるような方法で、副作用を表現することを目的としているのです。この意味で、言語はあくまで純粋だということです。

副作用のある値は、純粋な値とは異なる型を持っています。このように、例えば副作用のある引数を関数に渡すことはできず、予期せず副作用持つようなことが起こらなくなります。

`Eff`モナドで管理された副作用を実行する唯一の方法は、型`Eff eff a`の計算をJavaScriptから実行することです。

PureScriptコンパイラは、`--main`コンパイラオプションを与えることで、アプリケーションの起動時に `main`計算を呼び出すためのJavaScriptコードを簡単に追加で生成できるようにしています。`main`は` Eff`モナドでの計算であることが要求されます。

このように、`main`によって使われる副作用が期待されることを、開発者は正確に知ることができます。加えて、`main`がどのような種類の副作用を持つかを制限するのに`Eff`モナドを使うことができるので、例えば、アプリケーションはコンソールと相互作用するが、それ以外は何もしない、ということを確実に言うことができます。

## Effモナド

`Eff`モナドの目的は、副作用のある計算に型付けされたAPIを提供すると同時に、効率的なJavascriptを生成することにあります。これは**拡張可能作用**(extensible effects)のモナドとも呼ばれており、これについては後述します。

例を示しましょう。次のコードでは乱数を生成するための関数が定義されている`purescript-random`モジュールを使用しています。

```haskell
module Main where

import Control.Monad.Eff
import Control.Monad.Eff.Random

import Debug.Trace

main = do
  n <- random
  print n
```  
  
このファイルが`Main.purs` という名前で保存されているなら、次のコマンドでコンパイルすることができます。

```text
psc --main Main Main.purs
```

コンパイルされたJavaScriptを実行すると、コンソールに出力`0`と `1`の間で無作為に選ばれた数が表示されるでしょう。

このプログラムは、乱数生成とコンソール入出力というJavaScriptランタイムが提供する２種類のネイティブな作用を、do記法で組み合わせて使っています。

## 拡張可能作用

`psci`でモジュールを読み込み、`main`の型を調べてみましょう。

```text
> :t Main.main

forall eff. Eff (trace :: Trace, random :: Random | eff) Unit
```

この型はかなり複雑そうに見えますが、PureScriptのレコードの比喩で簡単に説明することができます。

レコード型を使った簡単な関数を考えてみましょう。

```haskell
fullName person = person.firstName ++ " " ++ person.lastName
```

この関数は `firstName`と` lastName`というプロパティを含むレコードから完全な名前の文字列を作成します。もし`psci`でこの関数の型を同様に調べたとすると、次のように表示されるでしょう。

```haskell
forall r. { firstName :: String, lastName :: String | r } -> String
```

この型は「**少なくとも**`fullName`は`firstName`と`lastName`という2つのフィールドを持つようなレコードをとり、`String`を返す.」というように読みます。

渡したレコードが `firstName`と`lastName`いうプロパティさえ持っていれば、その他に余計なフィールドを持っていたとしても`fullName`は気にしません。

```text
> firstName { firstName: "Phil", lastName: "Freeman", location: "Los Angeles" }

Phil Freeman
```

同様に、上の`main`の型は「`main`は**副作用のある計算**で、乱数生成とコンソール入出力、**およびそれ以外の任意の種類の副作用**を備えた任意の環境で実行することができ、型`Unit`の値を返す」というように解釈できます。

これは 「拡張可能作用」という名前の由来になっています。必要な副作用さえ備えていれば、その副作用の集まりをいつでも拡張できるということです。

## 作用の混在

拡張可能作用は`Eff`モナドで異なる型の副作用を**混在**(interleave)させることを可能にします。

先ほど使った`random`関数は次のような型を持っています。

```haskell
forall eff1. Eff (random :: Random | eff1) Number
```

この作用の集まり`(random :: Random | eff1)`は`main`で見たものと同じ**ではありません**。

しかし、作用が一致するように`random`の型を特殊化できます。`eff1` に `(trace :: Trace | eff)`を選べば、これらの２つの作用の集合は同じになります。

同様に `trace`は` main`の作用に合わせて特殊化できる型を持っています。

```haskell
forall eff2. String -> Eff (trace :: Trace | eff2) Unit
```

この場合は、`eff2`に`(random :: Random | eff)`を選ばなくてはなりません。

それが含む副作用を示す`random`と`print`の型がポイントで、より大きな副作用の集まりを持ったより大きな計算を構築するために、他の副作用を**混ぜ合わせる**ことができるのです。

`main`の型注釈を与えなくてもよいことに注意してください。`psc`は`random`と`trace`の多相的な型が与えられた`main`の最も一般的な型を見つけることができます。

## Effの種

`main`の型は今まで見てきた他の型とは異なります。それを説明するためには、まず`Eff` の**種**について考える必要があります。値がその型によって分類されるように、型がその種によって分類されることを思い出してください。これまでは`*`（型の種）と`->`（型構築子のための種を構築する）だけから構築された種のみを見てきました。

 `Eff`の種を見るには、`psci`で`:k` コマンドを使います。

```text
> :k Control.Monad.Eff.Eff

 # ! -> * -> *
```

今まで見たことのない記号が２つあります。

`!`は副作用の型についての**型レベルのラベル**を表す**作用**の種です。これを理解するためには、上の`main`で見た2つのラベルがいずれも種`!`を持っていることに注目してください。

```text
> :k Debug.Trace.Trace

  !

> :k Control.Monad.Eff.Random.Random

  !
```

`#`種構築子は**行**の種を構築するのに使われます。行とは順序なしラベル付きの集合のことです。

そして、`Eff`は作用の行と作用の返り値の型という２つの引数を持っています。つまり、 `Eff`の最初の引数は、作用の型の順序なしラベル付きの集合であり、２つめの引数は返り値の型だということです。

これで、先ほどの`main`の型を読むことができるようになりました。

```text
forall eff. Eff (trace :: Trace, random :: Random | eff) Unit
```

`Eff`の最初の引数は`(trace :: Trace, random :: Random | eff)`です。これは`Trace`作用と`Random`作用を含む行です。パイプ記号`|`は、ラベルが付けられた作用と、それに混ぜあわせたい**それ以外の任意の作用**を表す**行変数**(row variable)`eff`を区切っています。

`Eff`の2番目の引数は、計算の戻り値の型`Unit`です。

## オブジェクトと行

拡張可能作用とレコードに深いつながりをもたらしている`Eff`の種を考えてみましょう。

上で定義した関数`fullName`を考えます。

```haskell
fullName :: forall r. { firstName :: String, lastName :: String | r } -> String
fullName person = person.firstName ++ " " ++ person.lastName
```

種`*`の型だけが値を持つので、関数の矢印の左辺にある型の種は`*`でなければなりません。

中括弧は実際には構文糖であり、PureScriptコンパイラによって理解されている完全な型は次のようなものです。

```haskell
fullName :: forall r. Object (firstName :: String, lastName :: String | r) -> String
```

中括弧がなくなっており、`Object`構築子が追加されていることに注意してください。`Object`は`Prim`モジュールで定義されている組み込みの型構築子です。`Object`の種を調べてみると、次のようになっています。

```text
> :k Object

  # * -> *
```

つまり、`Object`は**型の行**をとり型を構築する型構築子なのです。これがレコードについての行多相関数を書くことを可能にしているのです。

この型システムでは、拡張可能作用を扱うのに、行多相レコード(拡張可能レコード)を使うときと同じ機構が使われています。唯一の違いは、ラベルに現れる型の**種**です。レコードは型の行によってパラメータ化され、`Eff`は作用の行によってパラメータ化されるのです。

これと同じ型システムの機能は、型構築子の行や、行の行でパラメータ化される型を構築するのにさえ使われることがあります！

## きめ細かな作用

作用の行は推論されるので、大抵の場合は`Eff`を使うときに型注釈は必須ではありませんが、計算でどの作用が期待されるのかをコンパイラに示すために型注釈が使われることがあります。

先ほどの例を、作用の**閉じた**行で注釈すると次のようになります。

```haskell
main :: Eff (trace :: Trace, random :: Random) Unit
main = do
  n <- random
  print n
```

行変数`eff`がないことに注意してください。こうすると、異なった作用の型を使う計算を誤って含めることはできません。このように、コードが持つことを許される副作用を制御することができるのです。

## ハンドラとアクション

`trace`や` random`のような関数は**アクション**と呼ばれます。アクションはそれらの関数の右辺に`Eff`型を持っており、その目的は新たな効果を**導入**することにあります。

これは`Eff`型が関数の引数の型として現れる**ハンドラ**とは対照的です。アクションが集合へ必要な作用を**追加**するのに対し、ハンドラは集合から作用を**除去**します。

例として、`purescript-exceptions`パッケージを考えてみます。このパッケージでは`throwException`と` catchException`という二つの関数が定義されています。

```haskell
throwException :: forall a eff. Error -> Eff (err :: Exception | eff) a

catchException :: forall a eff. (Error -> Eff eff a) -> 
                                Eff (err :: Exception | eff) a -> 
                                Eff eff a
```

`throwException`はアクションです。 `Eff`は右辺に現れていて、新しく`Exception`作用を導入します。

`catchException`はハンドラです。 `Eff`は関数の第２引数の型として出現しており、作用全体としては`Exception`作用を**除去**します。

特定の作用を必要とするコードの部分を限定するために型システムを使うことができるので、これは便利です。作用のあるコードをハンドラで包むことにより、その作用を許さないコードブロックの中に埋め込むことができます。

例えば、`Exception`作用を使って例外を投げるコード片を書き、それからそのコードを`catchException`で包むことによって、例外を許さないコード片の中にその計算を埋め込むことができるのです。

JSONドキュメントからアプリケーションの設定を読みたいとしましょう。文書を構文解析する過程で例外を投げることがあります。設定を読み構文解析するこの処理は、次のような型シグネチャを持つ関数として書くことができます。

```haskell
readConfig :: forall eff. Eff (err :: Exception | eff) Config
```

それから、`main`関数で`catchException`を使用して`Exception`作用を処理することができます。

```haskell
main = catchException printException $ do
  config <- readConfig
  runApplication config
  
  where
  printException e = trace (stackTrace e)
```

Preludeでも、副作用**なし**の計算を取り、それを純粋な値として安全に評価する`runPure`ハンドラが定義されています。

```haskell
type Pure a = forall e. Eff e a

runPure :: forall a. Pure a -> a
```

## 可変状態

Preludeには`ST`作用というまた別の作用も定義されています。

`ST`作用は変更可能な状態を操作するために使われます。純粋関数プログラミングを知っているなら、共有される変更可能な状態は問題を引き起こしやすいということも知っているでしょう。しかしながら、`ST`作用は型システムを使って安全で**局所的な**状態変化を可能にし、状態の共有を制限するのです。

`ST`作用は`Control.Monad.ST`モジュールで定義されています。これがどのように動作するかを確認するには、そのアクションの型を見る必要があります。

```haskell
newSTRef :: forall a h eff. a -> Eff (st :: ST h | eff) (STRef h a)

readSTRef :: forall a h eff. STRef h a -> Eff (st :: ST h | eff) a

writeSTRef :: forall a h eff. STRef h a -> a -> Eff (st :: ST h | eff) a

modifySTRef :: forall a h eff. STRef h a -> (a -> a) -> Eff (st :: ST h | eff) a
```

`newSTRef`は型`STRef h a`の変更可能な参照領域を新しく作るのに使われます。`STRef h a`は`readSTRef`アクションを使って状態を読み取ったり、`writeSTRef`アクションや`modifySTRef`アクションで状態を変更するのに使われます。型`a`は領域に格納された値の型で、型`h`は型システムの**メモリ領域**を表しています。

例を示します。小さな時間刻みで簡単な更新関数の実行を何度も繰り返すことによって、重力に従って落下する粒子の落下の動きをシミュレートしたいとしましょう。

粒子の位置と速度を保持する変更可能な参照領域を作成し、領域に格納された値を更新するのにforループ(`Control.Monad.Eff`の`forE`アクション)を使うことでこれを実現することができます。

```haskell
import Control.Monad.Eff
import Control.Monad.ST

simulate :: forall eff h. Number -> Number -> Number -> Eff (st :: ST h | eff) Number
simulate x0 v0 time = do
  ref <- newSTRef { x: x0, v: v0 }
  forE 0 (time * 1000) $ \i -> do
    modifySTRef ref (\o ->
      { v: o.v - 9.81 * 0.001
      , x: o.x + o.v * 0.001
      })
    return unit
  final <- readSTRef ref
  return final.x
```

計算の最後では、参照領域の最終的な値を読み取り、粒子の位置を返しています。

この関数が変更可能な状態を使っていても、その参照区画`ref`がプログラムの他の部分で使われるのが許されない限り、これは純粋な関数のままであることに注意してください。`ST`作用が禁止するものが正確には何であるのかについては後ほど見ます。

`ST`作用で計算を実行するには、`runST`関数を使用する必要があります。

```haskell
runST :: forall a eff. (forall h. Eff (st :: ST h | eff) a) -> Eff eff a
```

ここで注目して欲しいのは、領域型`h`が関数矢印の左辺にある**括弧の内側で**量化されているということです。`runST`に渡したどんなアクションでも、 **任意の領域**`h`がなんであれ動作するということを意味しています。

しかしながら、ひとたび参照領域が`newSTRef`によって作成されると、その領域の型はすでに固定されており、`runST`によって限定されたコードの外側で参照領域を使おうとしても型エラーになるでしょう。`runST`が安全に`ST`作用を除去できるのはこれが理由なのです！

実際に、`ST`はこの例の唯一の作用なので、`runPure`と`runST`を併用すると`simulate`を純粋な関数に変えることができます、

```haskell
simulate' :: Number -> Number -> Number -> Number
simulate' x0 v0 time = runPure (runST (simulate x0 v0 time))
```

`psci` でこの関数を実行してみてください。

```text
> Main.simulate' 100 0 0.0
100.00

> Main.simulate' 100 0 1.0
95.10

> Main.simulate' 100 0 2.0
80.39

> Main.simulate' 100 0 3.0
55.87

> Main.simulate' 100 0 4.0
21.54
```

もし`simulate`の定義を`runST`の呼び出しのところへ埋め込むとすると、次のようになります。

```haskell
simulate :: Number -> Number -> Number -> Number
simulate x0 v0 time = runPure (runST (do
  ref <- newSTRef { x: x0, v: v0 }
  forE 0 (time * 1000) $ \i -> do
    modifySTRef ref (\o ->  
      { v: o.v - 9.81 * 0.001
      , x: o.x + o.v * 0.001  
      })
    return unit  
  final <- readSTRef ref
  return final.x))
```

参照区画はそのスコープから逃れることができないことが`psc`コンパイラにわかりますし、安全に`var`に変換することができます。`runST`の呼び出しの本体に対して生成されたJavaScriptは次のようになります。

```javascript
var ref = { x: x0, v: v0 };

Control_Monad_Eff.forE(0)(time * 1000)(function (i) {
  return function __do() {
    ref = (function (o) {
      return {
        v: o.v - 9.81 * 1.0e-3, 
        x: o.x + o.v * 1.0e-3
      };
    })(ref);
    return Prelude.unit;
  };
})();

return ref.x;
``` 

局所的な変更可能状態を扱うとき、特に`Eff`モナドで効率のよいループを生成する`forE`、`foreachE`、`whileE`、`untilE`のようなアクションを一緒に使うときには、`ST`作用は短いJavaScriptを生成できる良い方法となります。

> ## 演習 {-}
> 
> 1. （やや難しい） もし分母で分子を割り切れないなら`throwException`を使って例外を投げるように`safeDivide`関数を書き直してください。
> 
> 1. （難しい） PIを推定するには次のような簡単な方法があります。単位正方形内にある多数の`N`個の点を無作為に選び、内接する円に含まれるものの個数`n`を数えます。このとき`4n/N`が円周率`pi`の概算となります。`forE`関数、`Random`作用、`ST`作用を使って、この方法で円周率`pi`を推定する関数を書いてください。

## DOM作用

この章の最後の節では、`Eff`モナドでの作用についてこれまで学んだことを、実際のDOM操作の問題に応用します。

DOMを直接扱ったり、オープンソースのDOMライブラリを扱う、自由に利用可能なPureScriptパッケージが幾つかあります。

- [`purescript-simple-dom`](http://github.com/aktowns/purescript-simple-dom) - JavaScript DOM APIのバインディング
- [`purescript-jquery`](http://github.com/purescript-contrib/purescript-jquery) - [jQuery](http://jquery.org)ライブラリのバインディング
- [`purescript-react`](http://github.com/purescript-contrib/purescript-react) - [React](http://facebook.github.io/react/)ライブラリへのバインディング
- [`purescript-angular`](http://github.com/purescript-contrib/purescript-angular) - [AngularJS](http://angularjs.org/)ライブラリのバインディング
- [`purescript-virtual-dom`](http://github.com/purescript-contrib/purescript-virtual-dom) - [virtual-dom](http://github.com/Matt-Esch/virtual-dom)ライブラリの最小限のラッパ

しかしながら、これらのライブラリのほとんどはまだ非常に新しくAPIが安定なため、この章の内容を安定させられるように、この章のソースコードの`Control.Monad.DOM`モジュールにはDOM要素を操作するための最小限の関数群が含まれています。

DOM要素を作成や操作をするための次のようなアクションが含まれています。

```haskell
body :: forall eff. Eff (dom :: DOM | eff) Node
createElement :: forall eff. String -> Eff (dom :: DOM | eff) Node
querySelector :: forall eff. String -> Eff (dom :: DOM | eff) (Maybe Node)
```

既存の要素の内容やスタイルを変更するためのアクションも用意されています。

```haskell
setText :: forall eff. String -> Node -> Eff (dom :: DOM | eff) Node
setInnerHTML :: forall eff. String -> Node -> Eff (dom :: DOM | eff) Node
appendChild :: forall eff. Node -> Node -> Eff (dom :: DOM | eff) Node
addClass :: forall eff. String -> Node -> Eff (dom :: DOM | eff) Node
```

そして、DOMイベントを処理するためのアクションがあります。

```haskell
addEventListener :: forall eff. String -> 
                                Eff (dom :: DOM | eff) Unit -> 
                                Node -> 
                                Eff (dom :: DOM | eff) Node
```

これらが住所録アプリケーションのユーザインターフェイスを作るのに必要なアクションです。

## 住所録のユーザーインタフェース

これから構築しようとしているユーザ·インタフェースは、HTMLとPureScriptファイルに分かれています。HTMLはページ上の要素の配置を定義し、PureScriptのコードはフォームの動的な振る舞いを制御する方法を定義します。

まずは利用者が住所録に新しい項目を追加できるフォームを構築することにしましょう。フォームには、さまざまなフィールド（姓、名前、都市、州など）を入力するテキストボックス、および検証エラーが表示される領域が含まれます。テキストボックスに利用者がテキストを入力すると、検証エラーが更新されます。

シンプルさを保つために、フォームは固定の形状とします。電話番号は種類（自宅、携帯電話、仕事、その他）ごとに別々のテキストボックスへ分けることにします。

`head`要素内の次のようなコードを除いて、HTMLファイルは完全に静的です。

```html
<script type="text/javascript" src="../dist/Main.js"></script>
<script type="text/javascript">
  onload = PS.Main.main;
</script>  
```

最初の行では`psc`によって生成されるJavaScriptコードを読み込み、2行目ではページがロードされたときに`PS.Main.main`関数が確実に実行されるようにしています。

`Main`モジュールはとても単純です。`Data.AddressBook.UI`モジュールには`setupEventHandlers`関数に処理をそのまま移譲する`main`関数だけが定義されています。

```haskell
main :: forall eff. Eff (trace :: Trace, dom :: DOM | eff) Unit
main = do
  trace "Attaching event handlers"
  setupEventHandlers 
```

これは混在した作用の一例になっていることに注目してください。下で見るように、`trace`関数は`Trace`作用を使い、`setupEventHandlers`関数は`Trace`作用と`DOM`作用の両方を使っています(`DOM`作用は`Control.Monad.Eff.DOM`で定義されています)。

`setupEventHandlers`関数もとても簡単です（単一の目的を持った小​​さな関数それぞれに分割することによって、コードについて理解するのが簡単になっていることに注目してください）​​。

```haskell
setupEventHandlers :: forall eff. Eff (trace :: Trace, dom :: DOM | eff) Unit
setupEventHandlers = do
  -- Listen for changes on form fields
  body >>= addEventListener "change" validateAndUpdateUI 
```

`setupEventHandlers`はまず文書のbodyへの参照を取得するために`body`アクションを使い、`>>=`を使ってその結果を`addEventListener`アクションに渡しています。`addEventListener`は`change`イベントを監視して、イベントが発生するとその度に`validateAndUpdateUI`アクションを呼び出します。

do記法の定義により、これを次のようにも書けることに注意してください。

```haskell
setupEventHandlers = do
  -- Listen for changes on form fields
  b <- body
  addEventListener "change" validateAndUpdateUI b
``` 

どちらが読みやすいかどうかは個人の好みの問題です。前者は名前が付けられた関数の引数がなく、**point-free**形式の一例となっています。その一方で、後者では文書のbodyの名前として`b`が使われています。

`validateAndUpdateUI`アクションの役目は、フォーム検証器を実行し、必要に応じて利用者にエラーのリストを表示することです。この場合も、他の関数へ処理を委譲することによってこれを行います。最初に、`querySelector`アクションを使用してページの`validationErrors`要素を選択しています。それから、その要素の内容を消去するために`setInnerHTML`アクションを使用しています。

```haskell
validateAndUpdateUI :: forall eff. Eff (trace :: Trace, dom :: DOM | eff) Unit
validateAndUpdateUI = do
  Just validationErrors <- querySelector "#validationErrors"        
  setInnerHTML "" validationErrors 
```

次に`validateAndUpdateUI`が`validateControls`アクションを呼び出し、フォームの検証を実行しています。

```haskell
  errorsOrResult <- validateControls
```

後ほどすぐに見るように、`errorsOrResult`はエラーのリストか`Person`レコードのどちらかを表す型`Either [String] Person`を持っています。

最後に、もし入​​力の検証に失敗すると、`validateAndUpdateUI`はページ上のエラーを表示するために `displayValidationErrors`アクションに処理を委譲します。
  
```haskell
  case errorsOrResult of
    Left errs -> displayValidationErrors errs
    Right result -> print result

  return unit
```

検証が成功した場合、コードは単にコンソールに検証結果を出力します。当然のことながら、実際のアプリケーションでは、次の手順でデータベースまたは同様のものにデータを保存することになるでしょう。

`validateControls`関数はより興味深いものです。`validateControls`の役割は、フォームの検証を実行し、成功または失敗のいずれかを示す結果を返すことであることを思い出してください。最初に行うことは、コンソールにデバッグメッセージを出力することです。

```haskell
validateControls :: forall eff. Eff (trace :: Trace, dom :: DOM | eff) 
                                    (Either [String] Person)  
validateControls = do
  trace "Running validators"
```

`Data.AddressBook.UI`モジュールでは、フォームフィールドから値を読み込む関数 `valueOf`が定義されています。ここでは型シグネチャだけを示し、実装については議論しません。

```haskell
valueOf :: forall eff. String -> Eff (dom :: DOM | eff) String
```

`valueOf`はフォーム要素のIDをとり、利用者がそのテキストボックスに入力した値を返します。

次に、`validateControls`はページ上のフォームフィールドからいろいろな文字列を読み取って`Data.AddressBook.Person`データ構造体を構築します。

```haskell
  p <- person 
    <$> valueOf "#inputFirstName"
    <*> valueOf "#inputLastName"
    <*> (address <$> valueOf "#inputStreet"
                 <*> valueOf "#inputCity"
                 <*> valueOf "#inputState")
    <*> sequence [ phoneNumber HomePhone <$> valueOf "#inputHomePhone"
                 , phoneNumber CellPhone <$> valueOf "#inputCellPhone"
                 ]
```

この計算では `person`、` address`、`phoneNumber`関数を持ち上げるために、`Eff`をApplicative関手として使用していることに注意してください。また、`Person`データ構造体の電話番号配列をまとめるために必要な`Eff`の配列を連鎖させるために、`Data.Traversable`の`sequense`関数を使っています。

最後に、`validateControls`は前の章で書いた検証関数を実行し、その結果を返します。

```haskell
  return $ validatePerson' p
```

残りのコー​​ドは`displayValidationErrors`関数です。`displayValidationErrors`はエラーの配列をとり、ページ上にそれらの文字列を出力します。

この関数が最初に行うことは、エラーを表示するための新しい`div`要素を作成することです。フォームのレイアウトを制御するために[Bootstrap library](http://getbootstrap.com/)を使っているので、`addClass`アクションを使って新しい要素に適切なCSSクラスを設定しています。

```haskell
displayValidationErrors :: forall eff. [String] -> Eff (dom :: DOM | eff) Unit
displayValidationErrors errs = do
  alert <- createElement "div"
    >>= addClass "alert" 
    >>= addClass "alert-danger"
```

このコードがpoint-free形式であることに改めて注意してください。興味のある読者は、これを`>>=`を使わないように書き換えてみることをおすすめします。

次のコードは`ul`要素を作成し先ほどの`div`に追加します。

```haskell
  ul <- createElement "ul"
  ul `appendChild` alert
```

配列内の各エラーそれぞれについて`li`要素を作成して、リストに追加します。`setText`アクションは、エラーメッセージを` li`要素のテキストコンテンツを設定するために使用されています。

```haskell
  foreachE errs $ \err -> do
    li <- createElement "li" >>= setText err
    li `appendChild` ul
    return unit
```

配列の要素について繰り返しを行うために、このコードでは`foreachE`アクションを使っています。これは以前に見た`traverse`関数に似ていますが、`Eff`モナドだけで使うように特殊化されています。

最後に、`querySelector`アクションを使って`validationErrors`要素を検索し、それに先ほどの`div`を追加します。
    
```haskell
  Just validationErrors <- querySelector "#validationErrors"
  alert `appendChild` validationErrors
  
  return unit
```

以上です！`grunt`を実行して、それからWebブラウザで `html/index.html`を開き、ユーザインターフェイスを試してみてください。

フォームフィールドにいろいろな値を入力すると、ページ上に出力された検証エラーを見ることができるでしょう。検証エラーをすべて修正すると、ブラウザのコンソール上に検証の結果が表示されるはずです。

このユーザインタフェースには明らかに改善すべき点がたくさんあります。演習ではアプリケーションがより使いやすくなるような方法を追究していきます。

> ## 演習 {-}
> 
> 1. (簡単) このアプリケーションを変更し、職場の電話番号のテキストボックスを追加してください。
>
> 1. (やや難しい) 検証エラーを`ul`要素を使ってリストで表示するかわりに、それぞれのエラーについてひとつづつ`alert`スタイルで`div`を作成するように、コードを変更してください。
>
> 1. (やや難しい) `>>=`の明示的な呼び出しを使わないように、`Data.AddressBook.UI`モジュールのコードを書き直してください。
> 1. (難しい、拡張) このユーザーインターフェイスの問題のひとつは、検証エラーがその発生源であるフォームフィールドの隣に表示されていないことです。コードを変更してこの問題を解決してください。
> 
>      **ヒント**：検証器によって返されるエラーの型は、エラーの原因となっているフィールドを示すために拡張する必要があります。次のようなエラー型を使用したくなるかもしれません。
>
>     ```haskell
>     data ValidationError = ValidationError String Field
>     
>     data Field = FirstNameField
>                | LastNameField 
>                | StreetField
>                | CityField
>                | StateField
>                | PhoneField PhoneType
>     ```
> 
>     適切なフォーム要素を選択するように、`Field`を`querySelector`アクションの呼び出しに変更する関数を書くする必要があるでしょう。

## まとめ

この章ではPureScriptでの副作用の扱いについての多くの考え方を導入しました。

- `Monad`型クラスと、それに関連するdo記法の導入しました。
- モナド則を導入し、do記法使って書かれたコードを変換する方法を説明しました
- 異なる副作用で動作するコードを書くために、モナドを抽象的に扱う方法を説明しました。
- モナドがApplicative関手の一例であること、両者がどのように副作用のある計算を可能にするのか、2つの手法の違いを説明しました。
- ネイティブな作用の概念を定義し、ネイティブな副作用を処理するために使用する`Eff`モナドを導入しました。
- どのように`Eff`モナドが拡張可能作用を提供するか、複数の種類のネイティブな作用を同じ計算に混在させる方法を説明しました。
- 作用やレコードが種システムでどのように扱われるか、拡張可能なレコードと拡張可能作用の関連を見ました。
- 乱数生成、例外、コンソール入出力、変更可能な状態、およびDOM操作といった、さまざまな作用を扱うために `Eff`モナドを使いました。

`Eff`モナドは現実のPureScriptコードにおける基本的なツールです。本書ではこのあとも、様々な場面で副作用を処理するために`Eff`モナドを使っていきます。

