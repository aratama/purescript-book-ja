# Applicativeによる検証

## この章の目標

この章では、`Applicative`型クラスによって表現される**Applicative関手**(applicative functor)という重要な抽象化と新たに出会うことになります。名前が難しそうに思えても心配しないでください。フォームデータの検証という実用的な例を使ってこの概念を説明していきます。Applicative関手を使うと、大量の決まり文句を伴うような入力項目の内容を検証するためのコードを、簡潔で宣言的な記述へと変えることができるようになります。

また、**Traversable関手**(traversable functor)を表現する`Traversable`という別の型クラスにも出会います。現実の問題への解決策からこの概念が自然に生じるということがわかるでしょう。

この章では第3章から引き続き電話帳を例として扱います。今回は電話番号だけでなく住所を含む**住所録**のデータ型を定義し、これらの型の値を検証する関数を書きます。これらの関数は、例えばデータ入力フォームの一部で、使用者へエラーを表示するウェブユーザインターフェイスで使われると考えてください。　　　　

## プロジェクトの準備

この章のソース·コードは、`src/Data/AddressBook.purs`と`src/Data/AddressBook/Validation.purs`というファイルで定義されています。

このプロジェクトは多くのBower依存関係を持っていますが、その大半はすでに見てきたものです。新しい依存関係は２つです。

- `purescript-control` - `Applicative` のような型クラスを使用して制御フローを抽象化する関数が定義されています
- `purescript-validation` - この章の主題である**`Applicative`による検証**のための関手が定義されています。

`Data.AddressBook`モジュールには、このプロジェクトのデータ型とそれらの型に対する`Show`インスタンスが定義されており、`Data.AddressBook.Validation`モジュールにはそれらの型の検証規則含まれています。

## 関数適用の一般化

**Applicative関手**の概念を理解するために、まずは以前に見た型構築子`Maybe`について考えてみましょう。

このモジュールのソースコードでは、次のような型を持つ`address`関数が定義されています。

```haskell
address :: String -> String -> String -> Address
```

この関数は、通りの名前、市、州という３つの文字列から型`Address`の値を構築するために使います。

この関数は簡単に適用できますので、`psci`でどうなるか見てみましょう。

```text
> :i Data.AddressBook

> address "123 Fake St." "Faketown" "CA"
Address { street: "123 Fake St.", city: "Faketown", state: "CA" }
```

しかし、通り、市、州の３つすべてが必ずしも入力されないものとすると、3つの場合それぞれで省略可能である値を示すために`Maybe`型を使用したくなります。

考えられる場合のひとつとしては、市が省略されている場合があるかもしれません。もし`address`関数を直接適用しようとすると、型検証器からエラーが表示されます。

```text
> :i Data.Maybe
> address (Just "123 Fake St.") Nothing (Just "CA")

Cannot unify Data.Maybe.Maybe u2 with Prim.String.
```

`address`は型`Maybe String`ではなく文字列型の引数を取るので、もちろんこれは予想どおりの型エラーです。

しかし、`Maybe`型で示される省略可能な値を扱うために`address`関数を「持ち上げ」ることができるはずだと期待することは理にかなっています。実際、`Control.Apply`で提供されている関数`lift3`がまさに求めているものです。

```text
> :i Control.Apply
> lift3 address (Just "123 Fake St.") Nothing (Just "CA")

Nothing
```

このとき、引数のひとつ(市)が欠落していたので、結果は、`Nothing`です。もし3つの引数すべてが`Just`構築子を使って与えられると、結果は値を含むことになります。

```text
> lift3 address (Just "123 Fake St.") (Just "Faketown") (Just "CA")
  
Just (Address { street: "123 Fake St.", city: "Faketown", state: "CA" })
```

`lift3`という関数の名前は、3引数の関数を持ち上げるために使用できることを示しています。引数の数が異なる関数を持ち上げる同様の関数が`Control.Apply`で定義されています。

## 任意個の引数を持つ関数の持ち上げ

これで、`lift2`や`lift3`のような関数を使えば、引数が2個や3個の関数を持ち上げることができるのはわかりました。でも、これを任意個の引数の関数へと一般化することはできるのでしょうか。

`lift3` の型を見てみるとわかりやすいでしょう。

```text
> :t Control.Apply.lift3
forall a b c d f. (Prelude.Apply f) => (a -> b -> c -> d) -> f a -> f b -> f c -> f d
```

上の`Maybe`の例では型構築子`f`は`Maybe`ですから、`lift3`は次のように特殊化されます。

```haskell
forall a b c d. (a -> b -> c -> d) -> Maybe a -> Maybe b -> Maybe c -> Maybe d
```

この型が言っているのは、3引数の任意の関数を取り、その関数を引数と返り値が`Maybe`で包まれた新しい関数へと持ち上げる、ということです。

もちろんどんな型構築子`f`についても持ち上げができるわけではないのですが、それでは`Maybe`型を持ち上げができるようにしているのは何なのでしょうか。さて、先ほどの型の特殊化では、`f`に対する型クラス制約から`Apply`型クラスを取り除いていました。`Apply`はPreludeで次のように定義されています。

```haskell
class Functor f where
  (<$>) :: forall a b. (a -> b) -> f a -> f b
  
class (Functor f) <= Apply f where
  (<*>) :: forall a b. f (a -> b) -> f a -> f b
```

`Apply`型クラスは`Functor`の下位クラスであり、`<$>`とよく似た型を持つ追加の関数`<*>`が定義されています。`<$>`と`<*>`の違いは、`<$>`がただの関数を引数に取るのに対し、`<*>`の最初の引数は型構築子`f`で包まれているという点です。これをどのように使うのかはこれからすぐに見ていきますが、その前にまず`Maybe`型について`Apply`型クラスをどう実装するのかを見ていきましょう。

```haskell
instance functorMaybe :: Functor Maybe where
  (<$>) f (Just a) = Just (f a)
  (<$>) f Nothing  = Nothing
  
instance applyMaybe :: Apply Maybe where
  (<*>) (Just f) (Just x) = Just (f x)
  (<*>) _        _        = Nothing
```

この型クラスのインスタンスが言っているのは、任意のオプショナルな値にオプショナルな関数を適用することができ、その両方が定義されている時に限り結果も定義される、ということです。

それでは、`<$>`と`<*>`を一緒に使ってどうやって引数が任意個の関数を持ち上げるのかを見ていきましょう。

１引数の関数については、`<$>`をそのまま使うだけです。

２引数の関数についても考えてみます。型`a -> b -> c`を持つカリー化された関数`f`があるとしましょう。これは型`a -> (b -> c)`と同じですから、`<$>` を`f`に適用すると型`f a -> f (b -> c)`の新たな関数を得ることになります。持ち上げられた(型`f a`の)最初の引数にその関数を部分適用すると、型`f (b -> c)`の新たな包まれた関数が得られます。それから、２番目の持ち上げられた(型`f b`の)引数へ`<*>`を適用することができ、型`f c`の最終的な値を得ます。

まとめると、もし `x :: f a`と`y :: f b`があるなら、式`(f <$> x) <*> y`は型`f c`を持つことがわかりました。Preludeで定義された優先順位の規則に従うと、`f <$> x <*> y`というように括弧を外すことができます。

一般的にいえば、最初の引数に`<$>`を使い、残りの引数に対しては`<*>`を使います。`lift3`で説明すると次のようになります。

```haskell
lift3 :: forall a b c d f. (Prelude.Apply f) => 
                           (a -> b -> c -> d) -> 
                           f a -> f b -> f c -> f d
lift3 f x y z = f <$> x <*> y <*> z
```

この式の型がちゃんと整合しているかの確認は、読者への演習として残しておきます。

例として、`<$>`と`<*>`をそのまま使うと、`Maybe`上に`address`関数を持ち上げることができます。

```text
> address <$> Just "123 Fake St." <*> Just "Faketown" <*> Just "CA"

Just (Address { street: "123 Fake St.", city: "Faketown", state: "CA" })

> address <$> Just "123 Fake St." <*> Nothing <*> Just "CA"

Nothing
```

このように、引数が異なる他のいろいろな関数を`Maybe`上に持ち上げてみてください。

## Applicative型クラス

これに関連する`Applicative`という型クラスが存在しており、次のように定義されています。

```haskell
class (Apply f) <= Applicative f where
  pure :: forall a. a -> f a
```

`Applicative`は`Apply`の下位クラスであり、 `pure`関数が定義されています。 `pure`は値を取り、その型の型構築子`f`で包まれた値を返します。

`Maybe`についての`Applicative`インスタンスは次のようになります。

```haskell
instance applicativeMaybe :: Applicative Maybe where
  pure x = Just x
```

Applicative関手は関数を持ち上げることを可能にする関手だと考えるとすると、`pure`は引数のない関数の持ち上げだというように考えることができます。

## Applicativeに対する直感的理解

PureScriptの関数は純粋であり、副作用は持っていません。Applicative関手は、関手`f`によって表現されたある種の副作用を提供するような、より大きな「プログラミング言語」を扱えるようにします。

たとえば、関手`Maybe`はオプショナルな値の副作用を表現しています。その他の例としては、型`err`のエラーの可能性の副作用を表す`Either err`や、大域的な構成を読み取る副作用を表すArrow関手(arrow functor)`r ->`があります。ここでは`Maybe`関手についてだけを考えることにします。

もし関手`f`が作用を持つより大きなプログラミング言語を表すとすると、`Apply`と`Applicative`インスタンスは小さなプログラミング言語(PureScript)から新しい大きな言語へと値や関数を持ち上げることを可能にします。

`pure`は純粋な(副作用がない)値をより大きな言語へと持ち上げますし、関数については上で述べたとおり`<$>`と`<*>`を使うことができます。

ここで新たな疑問が生まれます。もしPureScriptの関数と値を新たな言語へ埋め込むのに`Applicative`が使えるなら、どうやって新たな言語は大きくなっているというのでしょうか。この答えは関手`f`に依存します。もしなんらかの`x`について`pure x`で表せないような型`f a`の式を見つけたなら、その式はそのより大きな言語だけに存在する項を表しているということです。

`f`が`Maybe`のときの式`Nothing`がその例になっています。`Nothing`を何らかの`x`について`pure x`というように書くことはできません。したがって、PureScriptは省略可能な値を表す新しい項 `Nothing`を含むように拡大されたと考えることができます。

## その他の作用について

それでは、他にも`Applicative`関手へと関数を持ち上げる例をいろいろ見ていきましょう。

次は、`psci`で定義された3つの名前を結合して完全な名前を作る簡単なコード例です。

```text
> let fullName first middle last = last ++ ", " ++ first ++ " " ++ middle 

> fullName "Phillip" "A" "Freeman"
Freeman, Phillip A
```

この関数は、クエリパラメータとして与えられた3つの引数を持つ、(とても簡単な!)ウェブサービスの実装であるとしましょう。使用者が3つの引数すべてを与えたことを確かめたいので、引数が存在するかどうかを表す`Maybe`型をつかうことになるでしょう。`fullName`を`Maybe`の上へ持ち上げると、省略された引数を確認するウェブサービスを実装することができます。

```text
> :i Data.Maybe
> fullName <$> Just "Phillip" <*> Just "A" <*> Just "Freeman"
  
Just ("Freeman, Phillip A")

> fullName <$> Just "Phillip" <*> Nothing <*> Just "Freeman"
  
Nothing
```

この持ち上げた関数は、引数のいずれかが `Nothing`なら`Nothing`返すことに注意してください。

これで、もし引数が不正ならWebサービスからエラー応答を送信することができるので、なかなかいい感じです。しかし、どのフィールドが間違っていたのかを応答で表示できると、もっと良くなるでしょう。

`Meybe`上へ持ち上げる代わりに`Either String`上へ持ち上げるようにすると、エラーメッセージを返すことができるようになります。まずは入力を`Either String`を使ってエラーを発信できる計算に変換する演算子を書きましょう。

```text
> let (<?>) Nothing  err = Left err
      (<?>) (Just a) _ = Right a
```

**注意**： `Either err`Applicative関手において、`Left`構築子は失敗を表しており、`Right`構築子は成功を表しています。

これで`Either String`上へ持ち上げることで、それぞれの引数について適切なエラーメッセージを提供できるようになります。

```text
> let fullNameEither first middle last = 
    fullName <$> (first  <?> "First name was missing")
             <*> (middle <?> "Middle name was missing")
             <*> (last   <?> "Last name was missing")
  
> :t fullNameEither
Maybe String -> Maybe String -> Maybe String -> Either String String
```

この関数は`Maybe`の3つの省略可能な引数を取り、`String`のエラーメッセージか`String`の結果のどちらかを返します。

いろいろな入力でこの関数を試してみましょう。

```text
> fullNameEither (Just "Phillip") (Just "A") (Just "Freeman")
Right ("Freeman, Phillip A")

> fullNameEither (Just "Phillip") Nothing (Just "Freeman")
Left ("Middle name was missing")

> fullNameEither (Just "Phillip") (Just "A") Nothing
Left ("Last name was missing")
```

このとき、すべてのフィールドが与えられば成功の結果が表示され、そうでなければ省略されたフィールドのうち最初のものに対応するエラーメッセージが表示されます。しかし、もし複数の入力が省略されているとき、最初のエラーしか見ることができません。

```text
> fullNameEither Nothing Nothing Nothing
  
Left ("First name was missing")
```

これでも十分なときもありますが、エラー時に**すべての**省略されたフィールドの一覧がほしいときは、`Either String`よりも強力なものが必要です。この章の後半でこの解決策を見ていきます。

## 作用の結合

抽象的にApplicative関手を扱う例として、Applicative関手`f`によって表現された副作用を総称的に組み合わせる関数をどのように書くのかをこの節では示します。

これはどういう意味でしょうか？何らかの`a`について型 `f a`の包まれた引数の配列があるとしましょう。型`[f a]`の配列があるということです。直感的には、これは`f`によって追跡される副作用を持つ、返り値の型が`a`の計算の配列を表しています。これらの計算のすべてを順番に実行することができれば、`[a]`型の結果の配列を得るでしょう。しかし、まだ`f` によって追跡される副作用が残ります。つまり、元の配列の中の作用を「結合する」ことにより、型`[f a]`の何かを型`f [a]`の何かへと変換することができると考えられます。

任意の固定長配列の長さ `n` について、その引数を要素に持った長さ`n`の配列を構築するような`n`引数の関数が存在します。たとえば、もし `n`が`3`なら、関数は`\x y z -> [x, y, z]`です。 この関数の型は`a -> a -> a -> [a]`です。`Applicative`インスタンスを使うと、この関数を`f`の上へ持ち上げて関数型`f a -> f a -> f a -> f [a]`を得ることができます。しかし、いかなる`n`についてもこれが可能なので、いかなる引数の**配列**についても同じように持ち上げられることが確かめられます。

したがって、次のような関数を書くことができるはずです。

```haskell
combineArray :: forall f a. (Applicative f) => [f a] -> f [a]
```

この関数は副作用を持つかもしれない引数の配列をとり、それぞれの副作用を適用することで、`f`に包まれた単一の配列を返します。

この関数を書くためには、引数の配列の長さについて考えます。配列が空の場合はどんな作用も実行する必要はありませんから、`pure`を使用して単に空の配列を返すことができます。

```haskell
combineArray [] = pure []
```

実際のところ、これが可能な唯一の​​定義です！

入力の配列が空でないならば、型`f a`の先頭要素と、型`[f a]`の配列の残りについて考えます。また、再帰的に配列の残りを結合すると、型`f [a]`の結果を得ることができます。`<$>`と`<*>`を使うと、`cons`関数を先頭と配列の残りの上に持ち上げることができます。

```haskell
combineArray (x : xs) = (:) <$> x <*> combineArray xs
```

繰り返しになりますが、これは与えられた型に基づいている唯一の妥当な実装です。

`Maybe`型構築子を例にとって、`psci`でこの関数を試してみましょう。

```t
> combineArray [Just 1, Just 2, Just 3]
Just [1,2,3]

> combineArray [Just 1, Nothing, Just 2]
Nothing
```

`Meybe`へ特殊化して考えると、配列のすべての要素が`Just`であるとき、そのときに限りこの関数は`Just`を返します。そうでなければ、`Nothing`を返します。オプショナルな結果を返す計算の配列は、そのすべての計算が結果を持っていたときに全体も結果を持っているという、オプショナルな値に対応したより大きな言語での振る舞いに対する直感的な理解とこれは一致しています。

しかも、`combineArray`関数はどんな`Applicative`に対しても機能します！`Either err`を使ってエラーを発信するかもしれなかったり、`r ->`を使って大域的な状態を読み取る計算を連鎖させるときにも`combineArray`関数を使うことができるのです。

`combineArray`関数については、後ほど`Traversable`関手について考えるときに再び扱います。

> ## 演習 {-}
> 
> 1. (簡単) `lift2`を使って、オプショナルな引数に対して働く、数に対する演算子 `+`、 `-`、 `*`、`/`の持ち上げられたバージョンを書いてください。
> 
> 1. (やや難しい) 上で与えられた`lift3`の定義について、`<$>`と`<*>` の型が整合していることを確認して下さい。
> 
> 1. (難しい) 型`forall a f. (Applicative f) => Maybe (f a) -> f (Maybe a)`を持つ関数`combineMaybe`を書いてください。この関数は副作用をもつオプショナルな計算をとり、オプショナルな結果をもつ副作用のある計算を返します。

## Applicativeによる検証

この章のソースコードでは電話帳アプリケーションで使われるいろいろなデータ型が定義されています。詳細はここでは割愛しますが、`Data.AddressBook`モジュールからエクスポートされる重要な関数は次のような型を持っています。

```haskell
address :: String -> String -> String -> Address

phoneNumber :: PhoneType -> String -> PhoneNumber

person :: String -> String -> Address -> [PhoneNumber] -> Person
```

ここで、 `PhoneType`は次のような代数的データ型として定義されています。

```haskell
data PhoneType = HomePhone | WorkPhone | CellPhone | OtherPhone
```

これらの関数は住所録の項目を表す`Person`を構築するのに使います。例えば、`Data.AddressBook`には次のような値が定義されています。

```haskell
examplePerson :: Person
examplePerson = 
  person "John" "Smith" 
         (address "123 Fake St." "FakeTown" "CA") 
     [ phoneNumber HomePhone "555-555-5555"
         , phoneNumber CellPhone "555-555-0000"
     ]
```

`psci`でこれらの値使ってみましょう(結果は整形されています)。

```text
> :i Data.AddressBook
> examplePerson 

Person { 
  firstName: "John", 
  lastName: "Smith", 
  address: Address { 
    street: "123 Fake St.", 
    city: "FakeTown", 
    state: "CA" 
  }, 
  phones: [ PhoneNumber { 
    type: HomePhone, 
    number: "555-555-5555" 
  }, PhoneNumber { 
    type: CellPhone, 
    number: "555-555-0000" 
  }] 
}
```

前の章では型`Person`のデータ構造を検証するのに`Either String`関手をどのように使うかを見ました。例えば、データ構造の２つの名前を検証する関数が与えられたとき、データ構造全体を次のように検証することができます。

```haskell
nonEmpty :: String -> Either String Unit
nonEmpty "" = Left "Field cannot be empty"
nonEmpty _  = Right unit

validatePerson :: Person -> Either String Person
validatePerson (Person o) =
  person <$> (nonEmpty o.firstName *> pure o.firstName)
         <*> (nonEmpty o.lastName  *> pure o.lastName)
         <*> pure o.address
         <*> pure o.phones
``` 

最初の２行では`nonEmpty`関数を使って空文字列でないことを検証しています。もし入力が空なら`nonEMpty`はエラーを返し(`Left`構築子で示されています)、そうでなければ`Right`構築子を使って空の値(`unit`)を正常に返します。２つの検証を実行し、右辺の検証の結果を返すことを示す連鎖演算子`*>`を使っています。ここで、入力を変更せずに返す検証器として右辺では単に`pure`を使っています。

最後の２行では何の検証も実行せず、単に`address`フィールドと`phones`フィールドを残りの引数として`person`関数へと提供しています。

この関数は`psci`でうまく動作するように見えますが、以前見たような制限があります。

```haskell
> validatePerson $ person "" "" (address "" "" "") []
  
Left ("Field cannot be empty")
```

`Either String`Applicative関手は遭遇した最初のエラーだけを返します。でもこの入力では、名前の不足と姓の不足という２つのエラーがわかるようにしたくなるでしょう。

`purescript-validation`ライブラリは別のApplicative関手も提供されています。これは単に`V`と呼ばれていて、何らかの**半群**(Semigroup)でエラーを返す機能があります。たとえば、`V [String]`を使うと、新しいエラーを配列の最後に連結していき、`String`の配列をエラーとして返すことができます。

`Data.Validation`モジュールは`Data.AddressBook`モジュールのデータ構造を検証するために `V [String]`Applicative関手を使っています。

`Data.AddressBook.Validation`モジュールにある検証の例としては次のようになります。

```haskell
type Errors = [String]

nonEmpty :: String -> String -> V Errors Unit
nonEmpty field "" = invalid ["Field '" ++ field ++ "' cannot be empty"]
nonEmpty _     _  = pure unit

lengthIs :: String -> Number -> String -> V Errors Unit
lengthIs field len value | S.length value /= len = 
  invalid ["Field '" ++ field ++ "' must have length " ++ show len]
lengthIs _     _   _     = 
  pure unit

validateAddress :: Address -> V Errors Address 
validateAddress (Address o) = 
  address <$> (nonEmpty "Street" o.street *> pure o.street)
          <*> (nonEmpty "City"   o.city   *> pure o.city)
          <*> (lengthIs "State" 2 o.state *> pure o.state)
```

`validateAddress`は`Address`を検証します。`street`と`city`が空でないかどうか、`state`の文字列の長さが2であるかどうかを検証します。 

`nonEmpty`と`lengthIs`の２つの検証関数はいずれも、`Data.Validation`モジュールで提供されている`invalid`関数をエラーを示すために使っていることに注目してください。`[String]`半群を扱っているので、`invalid`は引数として文字列の配列を取ります。

`psci` でこの関数を使ってみましょう。

```text
> :i Data.AddressBook
> :i Data.AddressBook.Validation

> validateAddress $ address "" "" ""
  
Invalid ([ "Field 'Street' cannot be empty"
         , "Field 'City' cannot be empty"
         , "Field 'State' must have length 2"
         ])

> validateAddress $ address "" "" "CA"
  
Invalid ([ "Field 'Street' cannot be empty"
         , "Field 'City' cannot be empty"
         ])
```

これで、すべての検証エラーの配列を受け取ることができるようになりました。

## 正規表現検証器

`validatePhoneNumber`関数では引数の形式を検証するために正規表現を使っています。重要なのは`matches`検証関数で、この関数は`Data.String.Regex`モジュールのて定義されている`Regex`を使って入力を検証しています。

```haskell
matches :: String -> R.Regex -> String -> V Errors Unit
matches _     regex value | R.test regex value = 
  pure unit
matches field _     _     = 
  invalid ["Field '" ++ field ++ "' did not match the required format"]
```

繰り返しになりますが、`pure`は常に成功する検証を表しており、エラーの配列の伝達には`invalid`が使われています。

これまでと同じような感じで、`validatePhoneNumber`は`matches`関数から構築されています。

```haskell
validatePhoneNumber :: PhoneNumber -> V Errors PhoneNumber
validatePhoneNumber (PhoneNumber o) = 
  phoneNumber <$> pure o."type"
              <*> (matches "Number" phoneNumberRegex o.number *> pure o.number)
```

また、`psci`でいろいろな有効な入力や無効な入力に対して、この検証器を実行してみてください。

```text
> validatePhoneNumber $ phoneNumber HomePhone "555-555-5555"
  
Valid (PhoneNumber { type: HomePhone, number: "555-555-5555" })

> validatePhoneNumber $ phoneNumber HomePhone "555.555.5555"
  
Invalid (["Field 'Number' did not match the required format"])
```

> ## 演習 {-}
> 
> 1. (簡単) 正規表現の検証器を使って、`Address`型の`state`フィールドが2文字のアルファベットであることを確かめてください。**ヒント**： `phoneNumberRegex`のソースコードを参照してみましょう。
> 
> 1. (やや難しい) `matches`検証器を使って、文字列に全く空白が含まれないことを検証する検証関数を​​書いてください。この関数を使って、適切な場合に`nonEmpty`を置き換えてください。

## Traversable関手

残った検証器は、これまで見てきた検証器を組み合わせて`Person`全体を検証する`validatePerson`です。

```haskell
arrayNonEmpty :: forall a. String -> [a] -> V Errors Unit
arrayNonEmpty field [] = 
  invalid ["Field '" ++ field ++ "' must contain at least one value"]
arrayNonEmpty _     _  = 
  pure unit

validatePerson :: Person -> V Errors Person
validatePerson (Person o) =
  person <$> (nonEmpty "First Name" o.firstName *> 
              pure o.firstName)
         <*> (nonEmpty "Last Name"  o.lastName  *> 
              pure o.lastName)
         <*> validateAddress o.address
         <*> (arrayNonEmpty "Phone Numbers" o.phones *> 
              traverse validatePhoneNumber o.phones)
```

ここに今まで見たことのない興味深い関数がひとつあります。最後の行で使われている`traverse`です。

`traverse`は`Data.Traversable`モジュールの`Traversable`型クラスで定義されています。

```haskell
class (Functor t, Foldable t) <= Traversable t where
  traverse :: forall a b f. (Applicative f) => (a -> f b) -> t a -> f (t b)
  sequence :: forall a f. (Applicative f) => t (f a) -> f (t a)
```

`Traversable`は**Traversable関手**の型クラスを定義します。これらの関数の型は少し難しそうに見えるかもしれませんが、`validatePerson`は良いきっかけとなる例です。

すべてのTraversable関手は`Functor`と` Foldable`のどちらでもあります(**Foldable 関手**は構造をひとつの値へとまとめる、畳み込み操作を提供する型構築子であったことを思い出してください)。それ加えて、`Traversable`関手はその構造に依存した副作用のあつまりを連結する機能を提供します。

複雑そうに聞こえるかもしれませんが、配列の場合に特殊化して簡単に考えてみましょう。配列型構築子は`Traversable`である、つまり次のような関数が存在するということです。

```haskell
traverse :: forall a b f. (Applicative f) => (a -> f b) -> [a] -> f [b]
```

直感的には、Applicative関手`f`と、型`a`の値をとり型`b`の値を返す(`f`で追跡される副作用を持つ)関数が与えられたとき、型`[a]`の配列の要素それぞれにこの関数を適用し、型`[b]`の(`f`で追跡される副作用を持つ)結果を得ることができます。

まだよくわからないでしょうか。それでは、更に`f`を`V Errors`Applicative関手に特殊化して考えてみましょう。`traversable`が次のような型の関数だとしましょう。

```haskell
traverse :: forall a b. (a -> V Errors b) -> [a] -> V Errors [b]
```

この型シグネチャは、型`a`についての検証関数`f`があれば、`traverse f`は型`[a]`の配列についての検証関数であるということを言っています。これはまさに今必要になっている`Person`データ構造体の`phones`フィールドを検証する検証器そのものです！それぞれの要素が成功するかどうかを検証する検証関数を作るために、`validatePhoneNumber`を`traverse`へ渡しています。

一般に、`traverse`はデータ構造の要素をひとつづつ辿っていき、副作用のある計算を実行して結果を累積します。

`Traversable`のもう一つの関数、`sequence`の型シグネチャには見覚えがあるかもしれません。

```haskell
sequence :: forall a f. (Applicative m) => t (f a) -> f (t a)
```

実際、先ほど書いた`combineArray`関数は`Traversable`型の`sequence`関数が特殊化されたものに過ぎません。`t`を配列型構築子として、`combineArray`関数の型をもう一度考えてみましょう。

```haskell
combineArray :: forall f a. (Applicative f) => [f a] -> f [a]
```

`Traversable`関手は、作用のある計算の集合を集めてその作用を連鎖させるという、データ構造走査の考え方を把握できるようにするものです。実際、`sequence`と`traversable`は`Traversable`を定義するのにどちらも同じくらい重要です。これらはお互いが互いを利用して実装することができます。これについては興味ある読者への演習として残しておきます。

配列の`Traversable`インスタンスは`Data.Traversable`モジュールで与えられています。`traverse`の定義は次のようになっています。

```haskell
-- traverse :: forall a b f. (Applicative f) => (a -> f b) -> [a] -> f [b]
traverse _ [] = pure []
traverse f (x : xs) = (:) <$> f x <*> traverse f xs
``` 

入力が空の配列のときには、単に`pure`を使って空の配列を返すことができます。配列が空でないときは、関数`f`を使うと先頭の要素から型`f b`の計算を作成することができます。また、配列の残りに対して`traverse`を再帰的に呼び出すことができます。最後に、Applicative関手`f`までcons演算子`(:)`を持ち上げて、２つの結果を組み合わせます。

Traversable関手の例はただの配列以外にもあります。以前に見た`Maybe`型構築子も`Traversable`のインスタンスを持っています。`psci` で試してみましょう。

```text
> :i Data.Maybe

> traverse (nonEmpty "Example") Nothing
  
Valid (Nothing)

> traverse (nonEmpty "Example") (Just "")
  
Invalid (["Field 'Example' cannot be empty"])

> traverse (nonEmpty "Example") (Just "Testing")
  
Valid (Just (Unit {}))
```

これらの例では、`Nothing`の値の走査は検証なしで`Nothing`の値を返し、`Just x`を走査すると`x`を検証するのにこの検証関数が使われるということを示しています。つまり、`traverse`は型`a`についての検証関数をとり、`Maybe a`についての検証関数を返すのです。

他にも、何らかの型`a`についての`Tuple a`や`Either a`や、連結リストの型構築子`List`といったTraversable関手があります。一般的に、「コンテナ」のようなデータ型のコンストラクタは大抵は`Traversable`インスタンスを持っています。例として、演習では二分木の型の`Traversable`インスタンスを書くようになっています。

> ## 演習 {-}
> 
> 1. (やや難しい) 左から右へと副作用を連鎖させる、次のような二分木データ構造についての`Traversable`インスタンスを書いてください。
> 
>     ```haskell
>     data Tree a = Leaf | Branch (Tree a) a (Tree a)
>     ```
>     これは木の走査の順序に対応しています。行きがけ順の走査についてはどうでしょうか。帰りがけ順では？
> 
> 1. (やや難しい) `Data.Maybe`を使って`Person`の`address`フィールドを省略可能になるようにコードを変更してください。**ヒント**： `traverse`を使って型`Maybe a`のフィールドを検証してみましょう。
> 
> 1. (難しい) `traverse`を使って`sequence`を書いてみましょう。また、`sequence`を使って`traverse`を書けるでしょうか？

## Applicative関手による並列処理

これまでの議論では、Applicative関手がどのように「副作用を結合」させるかを説明するときに、「結合」(combine)という単語を選びました。しかしながら、これらのすべての例において、Applicative関手は作用を「連鎖」(sequence)させる、というように言っても同じく妥当です。`Traverse`関手はデータ構造に従って作用を順番に結合させる`sequence`関数を提供する、という直感的理解とこれは一致するでしょう。

しかし一般には、Applicative関手はこれよりももっと一般的です。Applicative関手の規則は、その計算を実行する副作用にどんな順序付けも強制しません。実際、並列に副作用を実行するためのApplicative関手というものは妥当になりえます。

たとえば、`V`検証関手はエラーの**配列**を返しますが、その代わりに`Set`半群を選んだとしてもやはり正常に動き、このときどんな順序でそれぞれの検証器を実行しても問題はありません。データ構造に対して並列にこれを実行することさえできるのです！

**非同期計算**を表現する型構築子`Async`は、並列に結果を計算する`Applicative`インスタンスを持つことができます。

```haskell
f <$> Async computation1 <*> Async computation2
```

この計算は、`computation1`と`computation2`を非同期に使って値を計算を始めるでしょう。そして両方の結果の計算が終わった時に、関数`f`を使ってひとつの結果へと結合するでしょう。

この考え方の詳細は、本書の後半で**コールバック地獄**の問題に対してApplicative関手を応用するときに見ていきます。

Applicative関手は並列に結合されうる副作用を捕捉する自然な方法です。

## まとめ

この章では新しい考え方をたくさん扱いました。

- 関数適用の概念を副作用の考え方を表現する型構築子へと一般化する、**Applicative関手**の概念を導入しました。
- データ構造の検証という課題にApplicative関手がどのような解決策を与えるか、単一のエラーの報告からデータ構造を横断するすべてのエラーの報告へ変換できるApplicative関手を見てきました。
- 要素が副作用を持つ値の結合に使われることのできるコンテナである**Traversable関手**の考え方を表現する、`Traversable`型クラス導入しました。

Applicative関手は多くの問題に対して優れた解決策を与える興味深い抽象化です。本書を通じて何度も見ることになるでしょう。今回は、**どうやって**検証を行うかではなく、**何を**検証器が検証すべきなのかを定義することを可能にする、宣言的なスタイルで書く手段をApplicative関手は提供しました。一般に、Applicative関手は**領域特化言語**の設計のための便利な道具になります。

次の章では、これに関連する**モナド**という型クラスについて見ていきましょう。

