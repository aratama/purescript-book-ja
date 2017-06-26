# 型クラス

## 章の目標

この章では、PureScriptの型システムによって可能になる強力な抽象化の形式、型クラスを導入します。

この章ではデータ構造をハッシュするためのライブラリを題材に説明していきます。データ自身の構造について直接考えることなく複雑なデータ構造をハッシュするために、型クラスの仕組みがどのようにして働くのかを見ていきます。

またPureScriptのPreludeと標準ライブラリに含まれる標準的な型クラスも見ていきます。PureScriptのコードは概念を簡潔に表現するために型クラスの強力さに大きく依存しているので、これらのクラスに慣れておくと役に立つでしょう。

## プロジェクトの準備

この章のソースコードは、ファイル `src/data/Hashable.purs`で定義されています。

このプロジェクトには以下のBower依存関係があります。

- `purescript-maybe`: オプショナルな値を表す `Maybe`データ型が定義されています。
- `purescript-tuples`: 値の組を表す `Tuple`データ型が定義されています。
- `purescript-either`: 非交和を表す `Either`データ型が定義されています。
- `purescript-strings`: 文字列を操作する関数が定義されています。

モジュール `Data.Hashable`は、これらのBowerパッケージによって提供されるモジュールをいくつかインポートします。

```haskell
module Data.Hashable where

import Data.Maybe
import Data.Tuple
import Data.Either
import Data.String
import Data.Function
```

## 見せてください！

型クラスの最初に扱う例は、すでに何回か見てきた関数に関係します。`show`は何らかの値を取りそれを文字列として表示する関数です。

`show`は`Prelude`モジュールの`Show`と呼ばれる型クラスで次のように定義されています。

```haskell
class Show a where
  show :: a -> String
```

このコードでは、型変数 `a`でパラメータ化された、`Show`という新しい**型クラス**(type class)を宣言しています。

型クラス**インスタンス**には、型クラスで定義された関数の、その型に特殊化された実装が含まれています。

例えば、Preludeにある`Boolean`値に対する`Show`型クラスインスタンスの定義は次のとおりです。

```haskell
instance showBoolean :: Show Boolean where
  show true = "true"
  show false = "false"
```

このコードは `showBool​​ean`という名前の型クラスのインスタンスを宣言します。

PureScriptでは、生成されたJavaScriptの可読性を良くするために型クラスインスタンスには名前をつけます。このとき、**`Boolean`型は`Show`型クラスに属している**といいます。

`psci`で`Show`型クラスについて異なる型でいくつかの値を表示してみましょう。

```text
> show true

"true"

> show 1.0

"1"

> show "Hello World"

"\"Hello World\""
```

この例ではさまざまなプリミティブ型の値を`show`しましたが、もっと複雑な型を持つ値を`show`することもできます。

```text
> i Data.Tuple
> show $ Tuple 1 true
"Tuple (1) (true)"

> :i Data.Maybe
> show $ Just "testing"
"Just (\"testing\")"
```

型`Data.Either`の値を表示しようとすると、興味深いエラーメッセージが表示されます。

```text
> :i Data.Either
> show $ Left 10
  
Error in declaration it
No instance found for Prelude.Show (Data.Either.Either Prim.String u8)
```

ここでの問題は`show`しようとしている型に対する`Show`インスタンスが存在しないということではなく、`psci`がこの型を推論できなかったということです。このエラーメッセージで**未知の型**`u8`と表示されているのがそれです。

`::`演算子を使って式に対して型注釈を加えると、`psci`が正しい型クラスインスタンスを選ぶことができるようになります。

```text
> show (Left 10 :: Either Number String)
  
"Left (10)"
```

`Show`インスタンスをまったく持っていない型もあります。関数の型`->`がその一例です。`Number`から`Number`への関数を`show`しようとすると、型検証器によってその通りのエラーメッセージが表示されます。

```text
> show $ \n -> n + 1
  
Error in declaration it
No instance found for Prelude.Show (Prim.Number -> Prim.Number)
```

> ## 演習 {-}
> 
> 1. (簡単)前章の`showShape`関数を使って、`Shape`型に対しての` Show`インスタンスを定義してみましょう。

## 標準的な型クラス

この節では、Preludeや標準ライブラリで定義されている標準的な型クラスをいくつか見ていきましょう。これらの型クラスはPureScript特有の抽象化の基礎としてあちこちで使われているので、これらの関数の基本についてよく理解しておくことを強くお勧めします。

### Eq型クラス

`Eq`型クラスは等値演算子(`==`)と不等値演算子(`/=`)を定義します。

```haskell
class Eq a where
  (==) :: a -> a -> Boolean
  (/=) :: a -> a -> Boolean
```

異なる型の2つの値を比較しても意味がありませんから、いずれの演算子も2つの引数が同じ型を持つ必要があることに注意してください。

`psci` で`Eq`型クラスを試してみましょう。

```text
> 1 == 2
false

> "Test" == "Test"
true
```

### Ord型クラス

`Ord`型クラスは順序付け可能な型に対して2つの値を比較する`compare`関数を定義します。`compare`関数が定義されていると、比較演算子 `<`、`>`と、その仲間`<=`、`>=`も定義されます。

```haskell
data Ordering = LT | EQ | GT

class (Eq a) <= Ord a where
  compare :: a -> a -> Ordering
```

`compare`関数は2つの値を比較して`Ordering`の3つの値のうちいずれかを返します。

-  `LT`  - 最初の引数が2番目の値より小さいとき
-  `EQ`  -  最初の引数が2番目の値と等しい(または比較できない)とき
-  `GT`  - 最初の引数が2番目の値より大きいとき

`compare`関数についても`psci`で試してみましょう。

```text
> compare 1 2
LT

> compare "A" "Z"
LT
```

###　Num型クラス

`Num`型クラスは加算、減算、乗算、除算などの数値演算子を使用可能な型を示します。必要に応じて再利用できるように、これらの演算子を抽象化するわけです。

**注意**: 関数呼び出しが型クラスの実装に基いて呼び出されるのとは対照的に、型クラス`Eq`や`Ord`、`Num`などはPureScriptでは特別に扱われ、`1 + 2 * 3`のような単純な式は単純なJavaScriptへと変換されます。

```haskell
class Num a where
  (+) :: a -> a -> a
  (-) :: a -> a -> a
  (*) :: a -> a -> a
  (/) :: a -> a -> a
  (%) :: a -> a -> a
  negate :: a -> a
```

### 半群とモノイド

`Semigroup`(半群)型クラスは、連結演算子 `<>`を提供する型を示します。

```haskell
class Semigroup a where
  (<>) :: a -> a -> a
```

普通の文字列連結について文字列は半群をなしますし、同様に配列も半群をなします。その他の標準的なインスタンスの幾つかは、 `purescript-monoid`パッケージで提供されています。

以前に見た`++`連結演算子は、`<>`の別名として提供されています。

`purescript-monoid`パッケージで提供されている`Monoid`型クラスは、`mempty`と呼ばれる空の値の概念で`Semigroup`型クラスを拡張します。

```haskell
class (Semigroup m) <= Monoid m where
  mempty :: m
```

文字列や配列はモノイドの簡単な例になっています。

`Monoid`型クラスインスタンスでは、「空」の値から始めて新たな値を合成していき、その型で**累積**した結果を返すにはどうするかを記述する型クラスです。例えば、畳み込みを使っていくつかのモノイドの値の配列を連結する関数を書くことができます。`psci`で試すと次のようになります。

```haskell
> :i Data.Monoid
> :i Data.Foldable
  
> foldl (<>) mempty ["Hello", " ", "World"]  
"Hello World"
  
> foldl (<>) mempty [[1, 2, 3], [4, 5], [6]]
[1,2,3,4,5,6]
```

`purescript-monoid`パッケージにはモノイドと半群の多くの例を提供しており、これらを本書で扱っていきます。

### Foldable型クラス

`Monoid`型クラスは畳み込みの結果になるような型を示しますが、`Foldable`型クラスは、畳み込みの元のデータとして使えるような型構築子を示しています。

また、`Foldable`型クラスは、配列や`Maybe`などのいくつかの標準的なコンテナのインスタンスを含む`purescript-foldable-traversable`パッケージで提供されています。

`Foldable`クラスに属する関数の型シグネチャは、これまで見てきたものよりも少し複雑です。

```haskell
class Foldable f where
  foldr :: forall a b. (a -> b -> b) -> b -> f a -> b
  foldl :: forall a b. (b -> a -> b) -> b -> f a -> b
  foldMap :: forall a m. (Monoid m) => (a -> m) -> f a -> m
```



この定義は`f`を配列の型構築子だと特殊化して考えてみるとわかりやすくなります。この場合、すべての`a`について`f a`を`[a]`に置き換える事ができますが、`foldl`と`foldr`の型が、最初に見た配列に対する畳み込みの型になるとわかります。

 `foldMap`についてはどうでしょうか？これは`forall m. (Monoid m)=>(a -> m) -> [a]  -> m `になります。この型シグネチャは、型`m`が`Monoid`型クラスのインスタンスであればどんな型でも返り値の型として選ぶことができると言っています。配列の要素をそのモノイドの値へと変換する関数を提供すれば、そのモノイドの構造を利用して配列を畳み込み、ひとつの値にして返すことができます。

それでは`psci` で`foldMap`を試してみましょう。

```text
> :i Data.Foldable

> foldMap show [1, 2, 3, 4, 5]
"12345"
```

ここではモノイドとして文字列を選び、`Number`を文字列として表示する`show`関数を使いました。それから、数の配列を渡し、それぞれの数を`show`してひとつの文字列へと連結した結果出力されました。

畳み込み可能な型は配列だけではありません。`purescript-foldable-traversable`では`Maybe`や`Tuple`のような型の`Foldable`インスタンスが定義されており、`purescript-lists`のような他のライブラリでは、そのライブラリのそれぞれのデータ型に対して`Foldable`インスタンスが定義されています。`Foldable`は**順序付きコンテナ**(ordered container)の概念を抽象化するのです。

### 関手と型クラス則

PureScriptで副作用を伴う関数型プログラミングのスタイルを可能にするための`Functor`と` Applicative`、`Monad`といった型クラスがPreludeでは定義されています。これらの抽象については本書で後ほど扱いますが、まずは「持ち上げ演算子」`<$>`の形ですでに見てきた`Functor`型クラスの定義を見てみましょう。

```haskell
class Functor f where
  (<$>) :: forall a b. (a -> b) -> f a -> f b
```

演算子`<$>`は関数をそのデータ構造まで「持ち上げる」(lift)ことができます。ここで「持ち上げ」という言葉の具体的な定義は問題のデータ構造に依りますが、すでにいくつかの単純な型についてその動作を見てきました。

```text
> :i Data.Array
> (\n -> n < 3) <$> [1, 2, 3, 4, 5]
  
[true, true, false, false, false]

> :i Data.Maybe
> Data.String.length <$> Just "testing"
  
Just (7)
```

`<$>`演算子は様々な構造の上でそれぞれ異なる振る舞いをしますが、`<$>`演算子の意味はどのように理解すればいいのでしょうか。

直感的には、`<$>`演算子はコンテナのそれぞれの要素へ関数を適用し、その結果から元のデータと同じ形状を持った新しいコンテナを構築するのだというように理解することができます。しかし、この概念を厳密にするにはどうしたらいいでしょうか？。

`Functor` の型クラスのインスタンスは、**関手則**(functor laws)と呼ばれる法則を順守するものと期待されています。

- `id <$> xs = xs`
- `g <$> (f <$> xs) = (g <<< f) <$> xs`

最初の法則は**恒等射律**(identity law)です。これは、恒等関数をその構造まで持ち上げると、元の構造をそのまま返す恒等射になるということと言っています。恒等関数は入力を変更しませんから、これは理にかなっています。

第二の法則は**合成律**(composition law)です。構造をひとつの関数で写してから２つめの関数で写すのは、２つの関数の合成で構造を写すのと同じだ、と言っています。

「持ち上げ」の一般的な意味が何であれ、データ構造に対する持ち上げ関数の正しい定義はこれらの法則に従っていなければなりません。

標準の型クラスの多くには、このような法則が付随しています。一般に、型クラスに与えられた法則は、型クラスの関数に構造を与え、インスタンスについて調べられるようにします。興味のある読者は、すでに見てきた標準の型クラスに属する法則について調べてみてもよいでしょう。

> ## 演習 {-}
> 
> 1. (簡単)次のnewtypeは複素数を表します。
> 
>     ```haskell
>     newtype Complex = Complex 
>         { real :: Number
>         , imaginary :: Number 
>         }
>     ```
> 
>     `Complex`について、`Show`と`Eq`のインスタンスを定義してください。
>     
> 1. (やや難しい)次は型`a`の要素の空でない配列の型を定義しています。
> 
>     ```haskell
>     data NonEmpty a = NonEmpty a [a]
>     ```
>     `[]`についての`Semigroup`インスタンスを再利用し、空でない配列についての`Semigroup`インスタンスを書いてみてください。
>     
> 1. (やや難しい) `NonEmpty`の`Functor`インスタンスを書いてみましょう。
> 
> 1. (難しい) `NonEmpty`の`Foldable`インスタンスを書いてみましょう。**ヒント**：配列の `Foldable`インスタンスを再利用してみましょう。

## 型注釈

型クラスを使うと、関数の型に制約を加えることができます。例を示しましょう。 `Eq`型クラスのインスタンスで定義された等値性を使って、３つの値が等しいかどうかを調べる関数を書きたいとします。

```haskell
threeAreEqual :: forall a. (Eq a) => a -> a -> a -> Boolean
threeAreEqual a1 a2 a3 = a1 == a2 && a2 == a3
```

この型宣言は`forall`を使って定義された通常の多相型のようにも見えます。しかし、太い矢印 `=>`で型の残りの部分から区切られた、括弧内の型クラス制約があります。

インポートされたモジュールのどれかに`a`に対する`Eq`インスタンスが存在するなら、どんな型`a`を選んでも`threeAsEqual`を呼び出すことができる、とこの型は言っています。

制約された型には複数の型クラスインスタンスを含めることができますし、インスタンスの型は単純な型変数に限定されません。`Ord`と` Show`のインスタンスを使って2つの値を比較する例を次に示します。

```haskell
showCompare :: forall a. (Ord a, Show a) => a -> a -> String
showCompare a1 a2 | a1 < a2 = 
  show a1 ++ " is less than " ++ show a2
showCompare a1 a2 | a1 > a2 = 
  show a1 ++ " is greater than " ++ show a2
showCompare a1 a2 = 
  show a1 ++ " is equal to " ++ show a2
```

型クラスで制約された関数を使うときには重要な制限があります。PureScriptコンパイラは制約された型を推論しません。型注釈の提供は必須になります。

`psci` で`Num`のような標準の型クラスのいずれかを使って、このことを試してみましょう。

```text
> :t \x -> x + x

Error in declaration it
No instance found for Prelude.Num u2
```

ここで、数を倍にするこの関数の型を、数の型の`Num`インスタンスを使って見つけようとしますが、`psci`は`x`の型が不明であるときはこの関数の制約された型を推論しないので、`psci`は未知の型の型クラスインスタンスを見つけることができないという旨を報告します。

たとえば`x`が数であることを表すには、次のように型検証器に指示しなければいけません。

```text
> :t \x -> x + (x :: Number)

Prim.Number -> Prim.Number
```
  
## インスタンスの重複

PureScriptには型クラスのインスタンスに関する**重複インスタンス規則**(Overlapping instances rule)という規則があります。型クラスのインスタンスが関数呼び出しのところで必要とされるときはいつでも、PureScriptは正しいインスタンスを選択するために型検証器によって推論された情報を使用します。そのとき、その型の適切なインスタンスがちょうどひとつだけ存在しなければなりません。

これを実証するために、適当な型に対して2つの異なる型クラスのインスタンスを作成してみましょう。次のコードでは、型 `T`の2つの重複する`Show`インスタンスを作成しています。

```haskell
module Overlapped where

data T = T

instance showT1 :: Show T where
  show _ = "Instance 1"
  
instance showT2 :: Show T where
  show _ = "Instance 2"
```

このモジュールはエラーなくコンパイルされます。`psci`を起動し、型`T`の`Show`インスタンスを見つけようとすると、重複インスタンス規則が適用され、エラーになります。

```text
> show T
  
Compiling Overlapped
Error in declaration it
Overlapping instances found for Prelude.Show Overlapped.T
```

重複インスタンスルールが適用されるのは、型クラスのインスタンスの自動選択が予測可能な処理であるようにするためです。もし型に対してふたつの型クラスインスタンスを許し、モジュールインポートの順序に従ってどちらかを選ぶようにすると、実行時のプログラムの振る舞いが予測できなくなってしまい好ましくありません。

適切な法則を満たすふたつ妥当な型クラスインスタンスが存在しうるなら、既存の型を包むnewtypeを定義するのが一般的な方法です。重複インスタンスのルールの下でも、異なるnewtypesなら異なる型クラスインスタンスを持つことが許されるので、問題はなくなります。この手法はPureScriptの標準ライブラリでも使われており、例えば`purescript-monoid`では、`Maybe a`型は`Monoid`型クラスの妥当なインスタンスを複数持っています。

## インスタンスの依存関係

制約された型を使うと関数の実装が型クラスインスタンスに依存できるように、型クラスインスタンスの実装は他の型クラスインスタンスに依存することができます。これにより、型を使ってプログラムの実装を推論するという、プログラム推論の強力な形式を提供します。

`Show`型クラスを例に考えてみましょう。要素を`show`する方法があるとき、その要素の配列を`show`する型クラスインスタンスを書くことができます。

```haskell
instance showArray :: (Show a) => Show [a] where
  show xs = "[" ++ go xs ++ "]"
    where
    go [] = ""
    go [x] = show x
    go (x : xs) = show x ++ ", " ++ go xs
```

PureScriptのPreludeに、このコードの最適化されたものが含まれています。

ここで、関数 `show`は様々な型の入力に対して使われていることに注意してください。`[a]`つまり要素が型`a`の配列の入力に対して動作するように`show`を定義しています。しかし、 `go`関数では、入力の先頭の要素を名前`x`として導入し、`show x`というように呼び出しています。ここでの`show`は型 `a`の**要素**に適用されています。

プログラムがコンパイルされると、`Show`の正しい型クラスのインスタンスは`show`の引数の推論された型に基づいて選ばれますが、このあたりの複雑さに開発者が関与することはありません。

> ## 演習 {-}
> 
> 1. (簡単) `Eq a`と`Eq [a]`のインスタンスを再利用して、型`NonEmpty a`に対する`Eq`インスタンスを書いてみましょう。
> 
> 1. (やや難しい) `Ord`のインスタンスを持つ任意の型`a`について、その他のどんな値よりも大きい「無限大」の値を新たに追加することができます。
> 
>     ```haskell
>     data Extended a = Finite a | Infinite
>     ```
>         
>     `a`の`Ord`インスタンスを再利用して、`Extended a`の`Ord`インスタンスを書いてみましょう。
>     
> 1. (難しい)　順序付きコンテナを定義する(そして`Foldable`のインスタンスを持っている)ような型構築子`f`が与えられたとき、追加の要素を先頭に含めるような新たなコンテナ型を作ることができます。
> 
>     ```haskell
>     data OneMore f a = OneMore a (f a)
>     ```
>     このコンテナ`OneMore f`もまた順序を持っています。ここで、新しい要素は任意の`f`の要素よりも前にきます。この`OneMore f`の`Foldable`インスタンスを書いてみましょう。
> 
>     ```haskell
>     instance foldableOneMore :: (Foldable f) => Foldable (OneMore f) where
>       ...
>     ```

## 多変数型クラス

型クラスは必ずしもひとつの型だけを型変数としてとるわけではありません。型変数がひとつだけなのが最も一般的ですが、実際には型クラスは**ゼロ個以上の**型変数を持つことができます。

それでは2つの型引数を持つ型クラスの例を見てみましょう。

```haskell
module Stream where

import Data.Maybe
import Data.Tuple
import Data.String

class Stream list element where
  uncons :: list -> Maybe (Tuple element list)

instance streamArray :: Stream [a] a where
  uncons [] = Nothing
  uncons (x : xs) = Just (Tuple x xs)

instance streamString :: Stream String String where
  uncons "" = Nothing
  uncons s = Just (Tuple (take 1 s) (drop 1 s))
```

この`Stream`モジュールでは、`uncons`関数を使ってストリームの先頭から要素を取り出すことができる、要素のストリームのような型を示すクラス `Stream`が定義されています。

`Stream`型クラスは、ストリーム自身の型だけでなくその要素の型も型変数として持っていることに注意してください。これによって、ストリームの型が同じでも要素の型について異なる型クラスインスタンスを定義することができます。

このモジュールでは、`uncons`がパターン照合で配列の先頭の要素を取り除くような配列のインスタンスと、文字列から最初の文字を取り除くような文字列のインスタンスという、 ２つの型クラスインスタンスが定義されています。

任意のストリーム上で動作する関数を記述することができます。例えば、ストリームの要素に基づいたモノイドで結果を累積する関数は次のようになります。

```haskell
import Data.Monoid

foldStream :: forall l e m. (Stream l e, Monoid m) => (e -> m) -> l -> m
foldStream f list =
  case uncons list of
    Nothing -> mempty
    Just (Tuple head tail) -> f head <> foldStream f tail
```

`psci`で使って、異なる`Stream`の型や異なる`Monoid`の型について`foldStream`を呼び出してみましょう。

## 型変数のない型クラス

ゼロ個の型変数を持つ型クラスを定義することもできます！型システムによってコードの大域的な性質の追跡ができるようになる、関数についてのコンパイル時表明に関係しています。

たとえば、型システムを使って部分関数の使用を追跡したいとしましょう。型引数のない型クラス`Partial`を定義し、すべての部分関数を`Partial`制約で注釈します。

```haskell
module Partial where

class Partial

head :: forall a. (Partial) => [a] -> a
head (x : _) = x

tail :: forall a. (Partial) => [a] -> [a]
tail (_ : xs) = xs
```

`Partial`モジュールの` Partial`型クラスのインスタンスを定義していないことに注意してください。こうすると目的を達成できます。このままの定義では`head`関数を使用しようとすると型エラーになるのです。

```text
> Partial.head [1, 2, 3]
  
Error in declaration it
No instance found for Partial.Partial 
```

このライブラリを使うには、2つの選択肢があります。

- このモジュールで`Partial`型クラスのインスタンスを定義し、そのモジュールの関数が部分的であることを了承したと表明します。

    ```haskell
    module Main where
    
    import Partial
    
    instance partial :: Partial
    ```
- あるいは、これらの部分関数を利用するすべての関数で `Partial`制約を再発行する方法もあります。

    ```haskell
    secondElement :: forall a. (Partial) => [a] -> a
    secondElement xs = head (tail xs)
    ```

## 上位クラス

インスタンスを別のインスタンスに依存させることによって型クラスのインスタンス間の関係を表現することができるように、いわゆる**上位クラス**(superclass)を使って型クラス間の関係を表現することができます。

あるクラスのどんなインスタンスも、その他のあるクラスのインスタンスで必要とされているとき、前者の型クラスは後者の型クラスの上位クラスであるといい、クラス定義で逆向きの太い矢印を使い上位クラス関係を示します。

すでに上位クラスの関係の一例について見ています。`Eq`クラスは`Ord`の上位クラスです。`Ord`クラスのすべての型クラスインスタンスについて、その同じ型に対応する` Eq`インスタンスが存在しなければなりません。`compare`関数が2つの値が比較できないと報告した時は、それらが実は同値であるかどうかを決定するために`Eq`クラスを使いたくなることが多いでしょうから、これは理にかなっています。

一般に、下位クラスの法則が上位クラスのメンバに言及しているとき、上位クラス関係を定義するのは理にかなっています。例えば、`Ord`と`Eq`のインスタンスのどんな組についても、もしふたつの値が`Eq`インスタンスのもとで同値であるなら、`compare`関数は`EQ`を返すはずだとみなすのは妥当です。言い換えれば、`a == b`ならば`compare a b == EQ`です。法則の階層上のこの関係は、`Eq`と`Ord`の間の上位クラス関係を説明します。

この場合に上位クラス関係を定義する別の考え方としては、この２つのクラスの間には明らかに"is-a"の関係があることです。下位クラスのすべてのメンバは、上位クラスのメンバでもあるということです。

> ### 演習 {-}
> 
> 1. (やや難しい) 次の`Action`クラスは、ある型の動作(action)を定義する、多変数型クラスです。
> 
>     ```haskell
>     class (Monoid m) <= Action m a where
>       act :: m -> a -> a
>     ```
>     
>     **act**はモノイドがどうやって他の型の値を変更するのに使われるのかを説明する関数です。この動作が　モノイドの連結演算子に従っていると期待しましょう。例えば、乗算を持つ自然数のモノイドは、文字列の何度かの繰り返しとして文字列に対して**動作**します。
>     
>     ```haskell
>     instance repeatAction :: Action Number String where
>       act 0 _ = ""
>       act n s = s ++ act (n - 1) s
>     ```
>     
>     `Action`クラスが`Monoid`クラスとどのように連携するかを説明する、妥当な法則を書いてみましょう。
>     
> 1. (やや難しい) インスタンス `Action m a => Action m [a]`を書いてみましょう。ここで、 配列上の動作は要素の順序で実行されるように定義されるものとします。
> 
> 1. (難しい) 以下のnewtypeが与えられたとき、`Action m (Self m)`のインスタンスを書いてみましょう。ここで、モノイド`m`は連結によって自身に作用するものとします。
> 
>     ```haskell
>     newtype Self m = Self m
>     ```
> 
> 1. (やや難しい) 引数のない型クラス`Unsafe`を定義し、型安全性を欠いていることを表現する制約としてそれを使い、`Prelude.Unsafe`モジュールから`unsafeIndex`関数の別バージョンを定義してみましょう。また、その関数を使って、
`Unsafe`制約を失わないように、配列の最後の要素を選択する`last`を定義してみましょう。

## ハッシュの型クラス

この最後の節では、章の残りを費やしてデータ構造をハッシュするライブラリを作ります。

このライブラリの目的は説明だけであり、堅牢なハッシングの仕組みの提供を目的としていないことに注意してください。

ハッシュ関数に期待される性質とはどのようなものでしょうか？

- ハッシュ関数は決定的でなくてはなりません。つまり、同じ値には同じハッシュ値を対応させなければなりません
- ハッシュ関数はいろいろなハッシュ値の集合で結果が一様に分布しなければなりません。

最初の性質はまさに型クラスの法則のように見える一方で、２番目の性質はもっとぼんやりとした規約に従っていて、PureScriptの型システムによって確実に強制できるようなものではなさそうです。しかし、これは型クラスについて次のような直感的理解を与えるはずです。

```haskell
type HashCode = Number

class (Eq a) <= Hashable a where
  hash :: a -> HashCode 
```

これに、`a == b`ならば`hash a == hash b`という関係性の法則が付随しています。

この節の残りの部分を費やして、`Hashable`型クラスに関連付けられているインスタンスと関数のライブラリを構築していきます。

決定的な方法でハッシュ値を結合する方法が必要になります。２つのハッシュ値を混ぜて結果を0-65535の間に分布させる次のような関数がその要求を満たしています。

```haskell
(<#>) :: HashCode -> HashCode -> HashCode
(<#>) h1 h2 = (73 * h1 + 51 * h2) % 65536
```

この演算子を使うと、２つのハッシュ値`h1`、`h2`を、`h1 <#> h2`.というように中置で連結することができます。 

それでは、入力の種類を制限する`Hashable`制約を使う関数を書いてみましょう。ハッシュ関数を必要とするよくある目的としては、2つの値が同じハッシュ値にハッシュされるかどうかを決定することです。`hashEqual`関係はそのような機能を提供します。

```haskell
hashEqual :: forall a. (Hashable a) => a -> a -> Boolean
hashEqual = (==) `on` hash
```

この関数はハッシュ同値性を定義するために`Data.Function`の`on`関数を使っていますが、このハッシュ同値性の定義は『それぞれの値が`hash`関数に渡されたあとで２つの値が等しいなら、それらの値は「ハッシュ同値」である』というように宣言的に読めるはずです。

プリミティブ型の`Hashable`インスタンスをいくつか書いてみましょう。まずは文字列のインスタンスです。`Data.String`モジュールにある`length`、`charCodeAt`という名前の関数を使います。以下の `Hashable`インスタンスは、累積されたハッシュ値と文字コードを`<＃>`演算子を使って連結するという動作を、文字列中の文字に対して反復します。

```haskell
instance hashString :: Hashable String where
  hash s = go 0 0
    where
    go :: Number -> HashCode -> HashCode
    go i acc | i >= length s = acc
    go i acc = go (i + 1) acc <#> charCodeAt i s
```

`Number`型のインスタンスについてはどうでしょうか。小数や無限大が出現するせいでJavaScriptの`Number`型を扱うといろいろ問題が生じますが、ここでは説明が目的なので、単純に`show`で計算された数値の文字列表現をハッシュすることにします。

```haskell
instance hashNumber :: Hashable Number where
  hash n = hash (show n)
```

`Number` の型クラスインスタンスは必ず`String`の型クラスインスタンスを使うことに注意してください。

`Boolean`型のインスタンスではさらに簡単です。単に型の2つの値に2つのハッシュ値を静的に割り当てるだけです。

```haskell
instance hashBoolean :: Hashable Boolean where
  hash false = 0
  hash true  = 1
```

これらの `Hashable`インスタンスが先ほどの型クラスの法則を満たしていることを証明するにはどうしたらいいでしょうか。同じ値が等しいハッシュ値を持っていることを確認する必要があります。`String`と`Boolean`の場合は、`Eq`の意味では同じ値でも厳密には同じではない、というような文字列や真偽値は存在しないので簡単です。

数値の場合は同じ数が同​​じ文字列表現を持っていることを簡単に説明しておかなければなりませんが、そうすれば後は文字列に対してすでに与えられた証明に従うことができます。

もっと面白い型についてはどうでしょうか。`<#>`使って入力配列の要素のハッシュ値を組み合わせた、配列の`Hashable`インスタンスは、次のようになります。

```haskell
instance hashArray :: (Hashable a) => Hashable [a] where
  hash [] = 0
  hash (x : xs) = hash x <#> hash xs
```

この場合、配列の長さに関する帰納を使うと、型クラスの法則を証明することができます。長さゼロの唯一の配列は `[]`です。配列の`Eq`の定義により、任意の二つの空でない配列は、それらの先頭の要素が同じで配列の残りの部分が等しいとき、その時に限り等しくなります。この帰納的な仮定により、配列の残りの部分は同じハッシュ値を持ちますし、もし`Hashable a`インスタンスがこの法則を満たすなら、先頭の要素も同じハッシュ値をもつことがわかります。したがって、２つの配列は同じハッシュ値を持ち、`Hashable [a]`も同様に型クラス法則を満たしています。

この章のソースコードには、 `Maybe`と` Tuple`型のインスタンスなど、他にも `Hashable`インスタンスの例が含まれています。

> ### 演習 {-}
> 
> 1. (簡単) `psci`を使って、各インスタンスのハッシュ関数をテストしてください。
> 
> 1. (やや難しい) 同値性の近似として`hashEqual`関数のハッシュ同値性を使い、配列が重複する要素を持っているかどうかを調べる関数を書いてください。ハッシュ値が一致したペアが見つかった場合は、`==`を使って値の同値性を厳密に検証することを忘れないようにしてください。
> 
> 1. (やや難しい) 型クラスの法則を満たす、次のnewtypeの `Hashable`インスタンスを書いてください。
> 
>     ```haskell
>     newtype Uniform = Uniform Number
>     
>     instance eqUniform :: Eq Uniform where
>       (==) (Uniform u1) (Uniform u2) = u1 % 1.0 == u2 % 1.0 
>       (/=) (Uniform u1) (Uniform u2) = u1 % 1.0 /= u2 % 1.0 
>     ```
>     
>     newtypeの`Uniform`とその`Eq`インスタンスは、同じ小数部分を持っているかの同値関係を持つ数の型を表しています。そのインスタンスが型クラスの法則を満たしていることを証明してください。
> 
> 1. (難しい) `Maybe`、` Either`、`Tuple`の` Hashable`インスタンスが型クラスの法則を満たしていることを証明してください。

## まとめ

この章では、型に基づく抽象化で、コードの再利用のための強力な形式化を可能にする**型クラス**を導入しました。PureScriptの標準ライブラリから標準の型クラスを幾つか見てきました。また、ハッシュ値を計算する型クラスに基づく独自のライブラリを定義しました。

この章では型クラス法則の考え方を導入するとともに、抽象化のための型クラスを使うコードについて、その性質を証明する手法を導入しました。型クラス法則は**等式推論**(equational reasoning)と呼ばれる大きな分野の一部であり、プログラミング言語の性質と型システムはプログラムについて論理的な推論をできるようにするために使われています。これは重要な考え方で、本書では今後あらゆる箇所で立ち返る話題となるでしょう。

