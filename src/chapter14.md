# 領域特化言語

## この章の目標

この章では、多数の標準的な手法を使ったPureScriptにおける**領域特化言語**(domain-specific language, DSL) の実装について探求していきます。

領域特化言語とは、特定の問題領域での開発に適した言語のことです。領域特化言語の構文および機能は、その領域内の考え方を表現するコードの読みやすさを最大限に発揮すべく選択されます。本書の中では、すでに領域特化言語の例を幾つか見てきています。

- 第11章で開発された`Game`モナドと関連するアクションは、**テキストアドベンチャーゲーム開発**という領域に対しての領域特化言語を構成しています。
- 第12章で `ContT`と` Parallel`関手のために書いたコンビネータのライブラリは、**非同期プログラミング**の領域に対する領域特化言語の例と考えることができます。
- 第13章で扱った `purescript-quickcheck`パッケージは、**生成的テスティング**の領域の領域特化言語です。このコンビネータはテストの性質対して特に表現力の高い記法を可能にします。

この章では、領域特化言語の実装において、いくつかの標準的な手法による構造的なアプローチを取ります。これがこの話題の完全な説明だということでは決してありませんが、独自の目的に対する具体的なDSLを構築するには十分な知識を与えてくれるでしょう。

この章で実行している例は、HTML文書を作成するための領域特化言語になります。正しいHTML文書を記述するための型安全な言語を開発することが目的で、少しづつ実装を改善することによって作業していきます。

## プロジェクトの準備

この章で使うプロジェクトには新しいBower依存性が追加されます。これから使う道具のひとつである**Freeモナド**が定義されている`purescript-free`ライブラリです。

このプロジェクトのソースコードは、Gruntを使ってビルドすることができます。

## HTMLデータ型

このHTMLライブラリの最も基本的なバージョンは `Data.DOM.Simple`モジュールで定義されています。このモジュールには次の型定義が含まれています。

```haskell
newtype Element = Element
  { name         :: String
  , attribs      :: [Attribute]
  , content      :: Maybe [Content]
  }

data Content
  = TextContent String
  | ElementContent Element

newtype Attribute = Attribute
  { key          :: String
  , value        :: String
  }
```

`Element`型はHTMLの要素を表しており、各要素は要素名、属性のペア​​の配列と、要素の内容でで構成されています。`content`プロパティでは、`Maybe`タイプを使って要素が開いている(他の要素やテキストを含む)か閉じているかを示しています。

このライブラリの鍵となる機能は次の関数です。

```haskell
render :: Element -> String
```

この関数はHTML要素をHTML文字列として出力します。`psci` で明示的に適当な型の値を構築し、ライブラリのこのバージョンを試してみましょう。

```text
> :i Data.DOM.Simple
> :i Data.Maybe

> render $ Element 
    { name: "p"
    , attribs: [
        Attribute 
          { key: "class"
          , value: "main" 
          }
      ]
    , content: Just [
        TextContent "Hello World!"
      ] 
    }
  
"<p class=\"main\">Hello World!</p>"
```

現状のライブラリにはいくつかの問題があります。

- HTML文書の作成に手がかかります。すべての新しい要素が少なくとも1つのレコードと1つのデータ構築子が必要です。
- 無効な文書を表現できてしまいます。
    - 要素名の入力を間違えるかもしれません
    - 要素に間違った型の属性を関連付けることができてしまいます
    - 開いた要素が正しい場合でも、閉じた要素を使用することができてしまいます
    
この章では、さまざまな手法を用いてこれらの問題を解決し、このライブラリーをHTML文書を作成するために使える領域特化言語にしていきます。

## スマート構築子

最初に導入する手法は方法は単純なものですが、とても効果的です。モジュールの使用者にデータの表現を露出する代わりに、モジュールエクスポートリスト(module exports list)を使ってデータ構築子`Element`、`Content`、`Attribute`を隠蔽し、正しいことが明らかなデータだけ構築する、いわゆる**スマート構築子**(smart constructors)だけをエクスポートします。

例を示しましょう。まず、HTML要素を作成するための便利な関数を提供します。

```haskell
element :: String -> [Attribute] -> Maybe [Content] -> Element
element name attribs content = Element
  { name:      name
  , attribs:   attribs
  , content:   content
  }
```

次に、`element`関数を適用することによってHTML要素を作成する、スマート構築子を作成します。

```haskell
a :: [Attribute] -> [Content] -> Element
a attribs content = element "a" attribs (Just content)

div :: [Attribute] -> [Content] -> Element
div attribs content = element "div" attribs (Just content)

p :: [Attribute] -> [Content] -> Element
p attribs content = element "p" attribs (Just content)

img :: [Attribute] -> Element
img attribs = element "img" attribs Nothing
```

最後に、正しいデータ構造だけを構築することがわかっているこれらの関数をエクスポートするように、モジュールエクスポートリストを更新します。

```haskell
module Data.DOM.Smart
  ( Element()
  , Attribute(..)
  , Content(..)

  , a
  , div
  , p
  , img

  , render
  ) where
```

モジュールエクスポートリストはモジュール名の直後の括弧内に書きます。各モジュールのエクスポートは次の3種類のいずれかです。

- 値の名前で示された、値(または関数)
- クラスの名で示された、型クラス
- 型の名前で示された型構築子、およびそれに続けて括弧で囲まれた関連するデータ構築子のリスト

ここでは、 `Element`の**型**をエクスポートしていますが、データ構築子はエクスポートしていません。もしデータ構築子をエクスポートすると、モジュールの使用者が不正なHTML要素を構築できてしまいます。

`Attribute`と`Content`型についてはデータ構築子をすべてエクスポートしています(エクスポートリストの記号`..`で示されています)。これから、これらの型にスマート構築子の手法を適用していきます。

すでにライブラリにいくつかの大きな改良を加わっていることに注意してください。

- 不正な名前を持つHTML要素を表現することは不可能です(もちろん、ライブラリが提供する要素名に制限されています)。
- 閉じた要素は、構築するときに内容を含めることはできません。

`Content`型にもとても簡単にこの手法を適用することができます。単にエクスポートリストから`Content`型のデータ構築子を取り除き、次のスマート構築子を提供します。

```haskell
text :: String -> Content
text = TextContent

elem :: Element -> Content
elem = ElementContent
```

`Attribute`型にも同じ手法を適用してみましょう。まず、属性のための汎用のスマート構築子を用意します。最初の試みとしては、次のようなものになるかもしれません。

```haskell
(:=) :: String -> String -> Attribute
(:=) key value = Attribute
  { key: key
  , value: value
  }
```

この定義では元の`Element`型と同じ問題に悩まされています。存在しなかったり、名前が間違っているような属性を表現することが可能です。この問題を解決するために、属性名を表すnewtypeを作成します。

```haskell
newtype AttributeKey = AttributeKey String
```

それから、この演算子を次のように変更します。

```haskell
(:=) :: AttributeKey -> String -> Attribute
(:=) (AttributeKey key) value = Attribute
  { key: key
  , value: value
  }
```

`AttributeKey`データ構築子をエクスポートしなければ、明示的にエクスポートされた次のような関数を使う以外に、使用者が型`AttributeKey`の値を構築する方法はありません。いくつかの例を示します。

```haskell
href :: AttributeKey
href = AttributeKey "href"

_class :: AttributeKey
_class = AttributeKey "class"

src :: AttributeKey
src = AttributeKey "src"

width :: AttributeKey
width = AttributeKey "width"

height :: AttributeKey
height = AttributeKey "height"
```

新しいモジュールの最終的なエクスポートリストは次のようになります。もうどんなデータ構築子も直接エクスポートしていないことに注意してください。

```haskell
module Data.DOM.Smart
  ( Element()
  , Attribute()
  , Content()
  , AttributeKey()

  , a
  , div
  , p
  , img

  , href
  , _class
  , src
  , width
  , height

  , (:=)
  , text
  , elem

  , render
  ) where
```

`psci` でこの新しいモジュールを試してみると、コードが大幅に簡潔になり、改良されていることがわかります。

```text
> :i Data.DOM.Smart
> render $ p [ _class := "main" ] [ text "Hello World!" ]
  
"<p class=\"main\">Hello World!</p>"
```

しかし、基礎のデータ表現が変更されていないので、`render`関数を変更する必要はなかったことにも注目してください。これはスマート構築子による手法の利点のひとつです。外部APIの使用者によって認識される表現から、モジュールの内部データ表現を分離することができるのです。

> ## 演習 {-}
> 
> 1. (簡単) `Data.DOM.Smart`モジュールで`render`を使った新しいHTML文書の作成を試してみましょう。
> 
> 1. (やや難しい)　`checked`と`disabled`など、値を要求しないHTML属性がありますが、これらは次のような**空の属性**として表示されるかもしれません。
> 
>     ```html
>     <input disabled>
>     ```
> 
>     空の属性を扱えるように`Attribute`の表現を変更してください。要素に空の属性を追加するために、 `：(=)`の代わりに使える関数を記述してください。

## 幻影型

次に適用する手法についての動機を与えるために、次のコードを考えてみます。

```text
> :i Data.DOM.Phantom
> render $ img [ src    := "cat.jpg"
               , width  := "foo"
               , height := "bar" 
               ]
  
"<img src=\"cat.jpg\" width=\"foo\" height=\"bar\" />"
```

ここでの問題は、`width`と`height`についての文字列値を提供しているということで、ここで与えることができるのはピクセルやパーセントの単位の数値だけであるべきです。

`AttributeKey`型にいわゆる**幻影型**(phantom type)引数を導入すると、この問題を解決できます。

```haskell
newtype AttributeKey a = AttributeKey String
```

定義の右辺に対応する型`a`の値が存在しないので、この型変数`a`は**幻影型**と呼ばれています。この型`a`はコンパイル時により多くの情報を提供するためだけに存在しています。任意の型`AttributeKey a`の値は実行時には単なる文字列ですが、そのキーに関連付けられた値に期待されている型を教えてくれます。

`AttributeKey`の新しい形式で受け取るように、`(:=)`演算子の型を次のように変更します。

```haskell
(:=) :: forall a. (IsValue a) => AttributeKey a -> a -> Attribute
(:=) (AttributeKey key) value = Attribute
  { key: key
  , value: toValue value
  }
```

ここで、ファントム型引数 `a`は、属性キーと属性値が互換性のある型を持っていることを確認するために使われます。使用者は`AttributeKey a`を型の値を直接作成できないので(ライブラリで提供されている定数を介してのみ得ることができます)、すべての属性が正しくなります。

`IsValue`制約は、キーに関連付けられた値がなんであれ、その値を文字列に変換し、生成したHTML内に出力できることを保証します。`IsValue`型クラスは次のように定義されています。　　

```haskell
class IsValue a where
  toValue :: a -> String
```

`String`と`Number`型についての型クラスインスタンスも提供しておきます。

```haskell
instance stringIsValue :: IsValue String where
  toValue = id

instance numberIsValue :: IsValue Number where
  toValue = show
```

また、これらの型が新しい型変数を反映するように、`AttributeKey`定数を更新しなければいけません。

```haskell
href :: AttributeKey String
href = AttributeKey "href"

_class :: AttributeKey String
_class = AttributeKey "class"

src :: AttributeKey String
src = AttributeKey "src"

width :: AttributeKey Number
width = AttributeKey "width"

height :: AttributeKey Number
height = AttributeKey "height"
```

これで、不正なHTML文書を表現することが不可能で、`width`と`height`属性を表現するのに数を使うことが強制されていることがわかります。

```text
> :i Data.DOM.Phantom
> render $ img [ src    := "cat.jpg"
               , width  := 100
               , height := 200 
               ]
  
"<img src=\"cat.jpg\" width=\"100\" height=\"200\" />"
```

> ## 演習　{-}
> 
> 1. (簡単) ピクセルまたはパーセントの長さのいずれかを表すデータ型を作成してください。その型について `IsValue`のインスタンスを書いてください。この型を使うように`width`と`height`属性を変更してください。
> 
> 1. (難しい) ファントム型を使って真偽値`true`、`false`についての表現を最上位で定義することで、`AttributeKey`が`disabled`や`chacked`のような**空の属性**を表現しているかどうかを符号化することができます。、
> 
> 
>     ```haskell
>     data True
>     data False
>     ```
> 
>     ファントム型を使って、使用者が`(:=)`演算子を空の属性に対して使うことを防ぐように、前の演習の解答を変更してください。

## Freeモナド

APIに施す最後の変更は、`Content`型をモナドにしてdo記法を使えるようにするために、**Freeモナド**と呼ばれる構造を使うことです。Freeモナドは、入れ子になった要素をわかりやすくなるよう、HTML文書の構造化を可能にします。次のようなコードを考えます。

```haskell
p [ _class := "main" ]
  [ elem $ img 
      [ src    := "cat.jpg"
      , width  := 100
      , height := 200 
      ]
  , text "A cat"
  ]
```

これを次のように書くことができるようになります。

```haskell
p [ _class := "main" ] $ do
  elem $ img 
    [ src    := "cat.jpg"
    , width  := 100
    , height := 200 
    ]
  text "A cat"
```

しかし、do記法だけがFreeモナドの恩恵だというわけではありません。モナドのアクションの**表現**をその**解釈**から分離し、同じアクションに**複数の解釈**を持たせることをFreeモナドは可能にします。

`Free`モナドは`purescript-free`ライブラリの`Control.Monad.Free`モジュールで定義されています。`psci`を使うと、次のようにFreeモナドについての基本的な情報を見ることができます。

```text
> :i Control.Monad.Free
> :k Free
(* -> *) -> * -> *
```

`Free`の種は、引数として型構築子を取り、別の型構築子を返すことを示しています。実は、`Free`モナドは任意の`Functor`を`Monad`にするために使うことができます！

モナドのアクションの**表現**を定義することから始めます。これを行うには、サポートする各モナドアクションそれぞれについて、ひとつのデータ構築子を持つ`Functor`を作成する必要があります。今回の場合、2つのモナドのアクションは`elem`と`text`になります。実際には、`Content`型を次のように変更するだけです。

```haskell
data ContentF a
  = TextContent String a
  | ElementContent Element a

instance functorContentF :: Functor ContentF where
  (<$>) f (TextContent s a) = TextContent s (f a)
  (<$>) f (ElementContent e a) = ElementContent e (f a)
```

ここで、この`ContentF`型構築子は以前の`Content`データ型とよく似ています。`Functor`インスタンスでは、単に各データ構築子で型`a`の構成要素に関数`f`を適用します。

これにより、最初の型引数として`ContentF`型構築子を使うことで構築された、新しい`Content`型構築子を`Free`モナドを包むnewtypeとして定義することができます。

```haskell
newtype Content a = Content (Free ContentF a)
```

ここでnewtypeを使っているのは、使用者に対してライブラリの内部表現を露出することを避けるためです。`Content`データ構築子を隠すことで、提供しているモナドのアクションだけを使うことを仕様者に制限しています。

`ContentF`は`Functor`なので、`Free ContentF`に対する`Monad`インスタンスが自動的に手に入り、このインスタンスを`Content`上の`Monad`インスタンスへと持ち上げることができます。

```haskell
runContent :: forall a. Content a -> Free ContentF a
runContent (Content x) = x

instance functorContent :: Functor Content where
  (<$>) f (Content x) = Content (f <$> x)

instance applyContent :: Apply Content where
  (<*>) (Content f) (Content x) = Content (f <*> x)

instance applicativeContent :: Applicative Content where
  pure = Content <<< pure

instance bindContent :: Bind Content where
  (>>=) (Content x) f = Content (x >>= (runContent <<< f))

instance monadContent :: Monad Content
```

`Content`の新しい型引数を考慮するように、少し` Element`データ型を変更する必要があります。モナドの計算の戻り値の型が`Unit`であることだけが要求されます。

```haskell
newtype Element = Element
  { name         :: String
  , attribs      :: [Attribute]
  , content      :: Maybe (Content Unit)
  }
```

また、  `Content`モナドについての新しいモナドのアクションになる`elem`と`text`関数を変更する必要があります。これを行うには、 `Control.Monad.Free`モジュールで提供されている`liftF`関数を使います。この関数の(簡略化された)型は次のようになっています。

```haskell
liftF :: forall f a. (Functor f) => f a -> Free f a
```

`liftF`は、何らかの型`a`について、型`f a`の値からFreeモナドのアクションを構築できるようにします。今回の場合、`ContentF`型構築子のデータ構築子を次のようにそのまま使うだけです。

```haskell
text :: String -> Content Unit
text s = Content $ liftF $ TextContent s unit

elem :: Element -> Content Unit
elem e = Content $ liftF $ ElementContent e unit
```

他にもコードの変更はありますが、興味深い変更は`render`関数に対してのものです。ここでは、このFreeモナドを**解釈**しなければいけません。

## モナドの解釈

`Control.Monad.Free`モジュールでは、Freeモナドで計算を解釈するための多数の関数が提供されています。

```haskell
go :: forall f a. (Functor f) => 
  (f (Free f a) -> Free f a) -> 
  Free f a -> 
  a
  
goM :: forall f m a. (Functor f, Monad m) => 
  (f (Free f a) -> m (Free f a)) -> 
  Free f a -> 
  m a
  
iterM :: forall f m a. (Functor f, Monad m) => 
  (forall a. f (m a) -> m a) -> 
  Free f a -> 
  m a
```

**純粋な**結果を計算するためにFreeモナドを使いたいなら、 `go`関数が便利です。`goM`関数と` iterM`関数は、モナドを使用してFreeモナドのアクションを解釈することができます。この2つの関数は解釈関数の型が若干異なりますが、ここでは`iterM`関数を使います。興味のある読者は、代わりに`goM`関数を使用してこのコードを再実装してみるといいでしょう。

まず、アクションを解釈することができるモナドを選ばなければなりません。`Writer String`モナドを使って、結果のHTML文字列を累積することにします。

新しい`render`メソッドは補助関数`renderElement`に移譲して開始し、`Writer`モナドで計算を実行するため`execWriter`を使用します。

```haskell
render :: Element -> String
render e = execWriter $ renderElement e
```

`renderElement`はwhereブロックで定義されています。

```haskell
  where
  renderElement :: Element -> Writer String Unit
  renderElement (Element e) = do
```

`renderElement` の定義は簡単で、いくつかの小さな文字列を累積するために`Writer`モナドの`tell`アクションを使っています。

```haskell
    tell "<"
    tell e.name
    for_ e.attribs $ \a -> do
      tell " "
      renderAttribute a
    renderContent e.content
```

次に、同じように簡単な`renderAttribute`関数を定義します。

```haskell
    where
    renderAttribute :: Attribute -> Writer String Unit
    renderAttribute (Attribute a) = do
      tell a.key
      tell "=\""
      tell a.value
      tell "\""
```

`renderContent`関数は、もっと興味深いものです。ここでは、`iterM`関数を使って、Freeモナドの内部で補助関数`renderContentItem`に移譲する計算を解釈しています。

```haskell
    renderContent :: Maybe (Content Unit) -> Writer String Unit
    renderContent Nothing = tell " />"
    renderContent (Just (Content content)) = do
      tell ">"
      iterM renderContentItem content
      tell "</"
      tell e.name
      tell ">"
```

`renderContentItem`の型は`iterM`の型シグネチャから推測することができます。関手`f`は型構築子`ContentF`で、モナド`m`は解釈している計算のモナド、つまり`Writer String`です。これにより`renderContentItem` について次の型シグネチャがわかります。

```haskell
    renderContentItem :: forall a. ContentF (Writer String a) -> Writer String a
```

`ContentF`の二つのデータ構築子でパターン照合するだけで、この関数を実装することができます。

```haskell
    renderContentItem (TextContent s rest) = do
      tell s
      rest
    renderContentItem (ElementContent e rest) = do
      renderElement e
      rest
```

それぞれの場合において、式`rest`は型`Writer String`を持っており、解釈計算の残りを表しています。`rest`アクションを呼び出すことによって、それぞれの場合を完了することができます。

これで完了です！`psci`で、次のように新しいモナドのAPIを試してみましょう。

```text
> :i Data.DOM.Free
> render $ p [] $ do
    elem $ img [ src := "cat.jpg" ]
    text "A cat"
  
"<p><img src=\"cat.jpg\" />A cat</p>"
```

> ## 演習 {-}
> 
> 1. (やや難しい) `ContentF`型に新しいデータ構築子を追加して、生成されたHTMLにコメントを出力する新しいアクション`comment`に対応してください。`liftF`を使ってこの新しいアクションを実装してください。新しい構築子を適切に解釈するように、解釈`renderContentItem`を更新してください。
> 
> 1. (難しい)　`goM`と`iterM`関数の問題のひとつに、**スタック安全**でないというものがあります。大きいモナドのアクションは、解釈したときにスタックオーバーフローを引き起こす可能性があるのです。しかしながら、`Control.Monad.Free`ライブラリは、スタック安全な `go`と`goEff`関数を提供しています。`Writer`モナドの代わりに`ST`作用を利用して、`goEff`関数を使って`Content`モナドを解釈してください。

## 言語の拡張

すべてのアクションが型`Unit`の何かを返すようなモナドは、さほど興味深いものではありません。実際のところ、概ね良くなったと思われる構文は別として、このモナドは`Monoid`以上の機能は何の追加していません。

意味のある結果を返す新しいモナドアクションでこの言語を拡張することで、Freeモナド構造の威力を説明しましょう​​。

**アンカー**を使用して文書のさまざまな節へのハイパーリンクが含まれているHTML文書を生成するとします。手作業でアンカーの名前を生成すればいいので、これは既に実現できています。文書中で少なくとも２回、ひとつはアンカーの定義自身に、もうひとつはハイパーリンクに、アンカーが含まれています。しかし、この方法には根本的な問題がいくつかあります。

- 開発者は一意なアンカー名を生成するために失敗することがあります。
- 開発者は、アンカー名のひとつまたは複数のインスタンスを誤って入力するかもしれません。

自分の間違いから開発者を保護するために、アンカー名を表す新しい型を導入し、新しい一意な名前を生成するためのモナドアクションを提供することができます。

最初の手順は、名前の型を新しく追加することです。

```haskell
newtype Name = Name String

runName :: Name -> String
runName (Name n) = n
```

繰り返しになりますが、`Name`は`String`のnewtypeとして定義しており、モジュールのエクスポートリスト内でデータ構築子をエクスポートしないように注意する必要があります。

次に、属性値として`Name`を使うことができるように、新しい型`IsValue`型クラスのインスタンスを定義します。

```haskell
instance nameIsValue :: IsValue Name where
  toValue (Name n) = n
```

また、次のように`a`要素に現れるハイパーリンクの新しいデータ型を定義します。

```haskell
data Href
  = URLHref String
  | AnchorHref Name

instance hrefIsValue :: IsValue Href where
  toValue (URLHref url) = url
  toValue (AnchorHref (Name nm)) = "#" ++ nm
```

`href`属性の型の値を変更して、この新しい`Href`型の使用を強制します。また、要素をアンカーに変換するのに使う新しい`name`属性を作成します。

```haskell
href :: AttributeKey Href
href = AttributeKey "href"

name :: AttributeKey Name
name = AttributeKey "name"
```

残りの問題は、現在モジュールの使用者が新しい名前を生成する方法がないということです。`Content`モナドでこの機能を提供することができます。まず、`ContentF`型構築子に新しいデータ構築子を追加する必要があります。

```haskell
data ContentF a
  = TextContent String a
  | ElementContent Element a
  | NewName (Name -> a)
```

`NewName`データ構築子は型`Name`の値を返すアクションに対応しています。データ構築子の引数として`Name`を要求するのではなく、型`Name -> a`の**関数**を提供するように使用者に要求していることに注意してください。型`a`は**計算の残り**を表していることを思い出すと、この関数は、型`Name`の値が返されたあとで、計算を継続する方法を提供するというように直感的に理解することができます。

新しいデータ構築子を考慮するように、`ContentF`についての` Functor`インスタンスを更新する必要があります。

```haskell
instance functorContentF :: Functor ContentF where
  (<$>) f (TextContent s a) = TextContent s (f a)
  (<$>) f (ElementContent e a) = ElementContent e (f a)
  (<$>) f (NewName k) = NewName (f <<< k)
```

そして、先ほど述べたように、`liftF`関数を使うと新しいアクションを構築することができます。

```haskell
newName :: Content Name
newName = Content $ liftF $ NewName id
```

`id`関数を継続として提供していることに注意してください。型`Name`の結果を変更せずに返すということを意味しています。

最後に、新しいアクションを解釈するために、解釈関数を更新する必要があります。以前は計算を解釈するために`Writer String`モナドを使っていましたが、このモナドは新しい名前を生成する能力を持っていないので、何か他のものに切り替えなければなりません。`RWS`モナドなら、`Writer`の機能を提供するだけでなく、純粋な状態を扱うことができます。型シグネチャを短く保てるように、この解釈モナドを型同義語としての定義しておきます。

```haskell
type Interp = RWS Unit String Number
```

`RWS`モナドは3つの型引数を取ることを思い出してください。
最初は大域的な設定で、今回は単なる`Unit`です。２つめは「ログ」型で、累積するH
TML文字列です。最後の引数は状態の型で、この場合は増加していくカウンタとして振る舞う数で、一意な名前を生成するのに使われます。

`Writer`と`RWS`モナドはそれらのアクションを抽象化するのに同じ型クラスメンバを使うので、どのアクションも変更する必要がありません。必要なのは、`Writer String`への参照すべてを`Interp`で置き換えることだけです。しかし、この計算を実行するために使われるハンドラを変更しなければいけません。`execWriter`の代わりに、`evalRWS`を使います。

```haskell
render :: Element -> String
render e = snd $ evalRWS (renderElement e) unit 0
```

`snd`の呼び出しは`evalRWS`から返された`Tuple`の**２番めの要素**だけを返すようにします。この場合は、累積されたHTML文字列を表しています。

新しい`NewName`データ構築子を解釈するために、`renderContentItem`に新しい場合分けを追加しなければいけません。

```haskell
    renderContentItem (NewName k) = do
      n <- get
      let name = Name $ "name" ++ show n
      put $ n + 1
      k name
```

ここで、型`Name -> Interp a`の継続`k`が与えられているので、型`Interp a`の解釈を構築しなければいけません。この解釈は単純です。`get`を使って状態を読み、その状態を使って一意な名前を生成し、それから`put`で状態をインクリメントしています。最後に、継続にこの新しい名前を渡して、計算を完了します。

これにより、`psci`で、`Content`モナドの内部で一意な名前を生成し、要素の名前とハイパーリンクのリンク先の両方を使って、この新しい機能を試してみましょう。

```text
> :i Data.DOM.Name
> render $ p [ ] $ do
    top <- newName
    elem $ a [ name := top ] $ 
      text "Top"
    elem $ a [ href := AnchorHref top1 ] $ 
      text "Back to top"
  
"<p><a name=\"name0\">Top</a><a href=\"#name0\">Back to top</a></p>"
```

複数回の`newName`呼び出しの結果が、実際に一意な名前になっていることを確かめてみてください。

> ## 演習 {-}
> 
> 1. (やや難しい) 使用者から`Element`型を隠蔽すると、さらにAPIを簡素化することができます。次の手順に従って、これらの変更を行ってください。
> 
>     - `p`や`img`のような(返り値が`Element`の)関数を`elem`アクションと結合して、型`Content Unit`を返す新しいアクションを作ってください。
>     - 型`Content a`の引数を許容し、結果の型`Tuple String`を返すように、`render`関数を変更してください。
>  
> 1. (難しい) 次の新しいアクションをサポートするように、`ContentF`タイプを変更してください。
> 
>     ```haskell
>     isMobile :: Content Boolean
>     ```
> 
>　    このアクションは、この文書がモバイルデバイス上での表示のためにレンダリングされているかどうかを示す真偽値を返します。
>　    
>　    **ヒント**： `RWS`モナドの`ask`アクションと `Reader`コンポーネントを使って、このアクションを解釈してください。

## まとめ

この章では、いくつかの標準的な技術を使って、単純な実装を段階的に改善することにより、HTML文書を作成するための領域特化言語を開発しました。

- データ表現の詳細を隠蔽し、**構築方法により正しい**文書を作ることだけを許可するために、**スマート構築子**を使いました。
- 言語の構文を改善するために、**ユーザ定義の中置２項演算子**を使用しました。
- 使用者が間違った型の属性値を提供するのを防ぐために、データの型に追加の情報を符号化する**幻影型**を使用しました。
- Freeモナドを使って、内容の集まりの配列内包表記をdo表記を提供するモナド表現に変換しました。モナドの新しいアクションをサポートするためにこの表現を拡張し、`Writer`と` RWS`モナドでモナド計算を解釈しました。

使用者が間違いを犯すのを防ぎ、領域特化言語の構文を改良するために、これらの手法はすべてPureScriptのモジュールと型システムを活用しています。

関数型プログラミング言語による領域特化言語の実装は活発に研究されている分野ですが、いくつかの簡単なテクニックに対して役に立つ導入を提供し、表現力豊かな型を持つ言語で作業すること威力を示すことができていれば幸いです。

