# 関数とレコード

## この章の目標

この章では、関数およびレコードというPureScriptプログラムのふたつの構成要素を導入します。さらに、どのようにPureScriptプログラムを構造化するのか、どのように型をプログラム開発に役立てるかを見ていきます。　

連絡先のリストを管理する簡単​​な住所録アプリケーションを作成していきます。このコード例により、PureScriptの構文からいくつかの新しい概念を導入します。

このアプリケーションのフロントエンドは対話式処理系 `PSCi`を使うようにしていますが、JavaScriptでフロントエンドを書くこともできるでしょう。実際に後の章で、フォームの検証と保存および復元の機能追加について詳しく説明します。

## プロジェクトの準備

この章のソースコードは `src/Data/AddressBook.purs`というファイルに含まれています。このファイルは次のようなモジュール宣言とインポート一覧から始まります。

```haskell
module Data.AddressBook where

import Prelude

import Control.Plus (empty)
import Data.List (List(..), filter, head)
import Data.Maybe (Maybe)
```

ここでは、いくつかのモジュールをインポートします。

- `Control.Plus`モジュールには後ほど使う `empty`値が定義されています。
- `purescript-lists`パッケージで提供されている `Data.List`モジュールをインポートしています。 `purescript-lists`パッケージはbowerを使用してインストールすることができ、連結リストを使うために必要ないくつかの関数が含まれています。
- `Data.Maybe`モジュールは、値が存在したりしなかったりするような、オプショナルな値を扱うためのデータ型と関数を定義しています。
- (訳者注・ダブルドット(..)を使用すると、指定された型コンストラクタのすべてのデータコンストラクタをインポートできます。)

このモジュールのインポート内容が括弧内で明示的に列挙されていることに注目してください。明示的な列挙はインポート内容の衝突を避けるのに役に立つので、一般に良い習慣です。

ソースコードリポジトリを複製したと仮定すると、この章のプロジェクトは次のコマンドを使用してPulpを使用して構築できます。

```text
$ cd chapter3
$ bower update
$ pulp build
```

## 単純な型

JavaScriptのプリミティブ型に対応する組み込みデータ型として、PureScriptでは数値型と文字列型、真偽型の３つが定義されており、それぞれ `Number`、 `String`、 `Boolean`と呼ばれています。これらの型はすべてのモジュールに暗黙にインポートされる `Prim`モジュールで定義されています。`pulp repl`の `:type`コマンドを使用すると、簡単な値の型を確認できます。

```text
$ pulp repl

> :type 1.0
Number

> :type "test"
String

> :type true
Boolean
```

PureScriptには他にも、配列とレコード、関数などの組み込み型が定義されています。

整数は、小数点以下を省くことによって、型 `Number`の浮動小数点数の値と区別されます。

```text
> :type 1
Int
```

二重引用符を使用する文字列リテラルとは異なり、文字リテラルは一重引用符で囲みます。

```text
> :type 'a'
Char
```

配列はJavaScriptの配列に対応していますが、JavaScriptの配列とは異なり、PureScriptの配列のすべての要素は同じ型を持つ必要があります。

```text
> :type [1, 2, 3]
Array Int

> :type [true, false]
Array Boolean

> :type [1, false]
Could not match type Int with Boolean.
```

最後の例で起きているエラーは型検証器によって報告されたもので、配列の2つの要素の型を**単一化**(Unification)しようとして失敗したこと示しています。

レコードはJavaScriptのオブジェクトに対応しており、レコードリテラルはJavaScriptのオブジェクトリテラルと同じ構文になっています。

```text
> author = { name: "Phil", interests: ["Functional Programming", "JavaScript"] }

> :type author
{ name :: String
, interests :: Array String
}
```

この型が示しているのは、オブジェクト `author`は、

- `String`型のフィールド `name`
- `Array String`つまり `String`の配列の型のフィールド `interests`

という２つの**フィールド**(field)を持っているということです。

レコードのフィールドは、ドットに続けて参照したいフィールドのラベルを書くと参照することができます。

```text
> author.name
"Phil"

> author.interests
["Functional Programming","JavaScript"]
```

PureScriptの関数はJavaScriptの関数に対応しています。PureScriptの標準ライブラリは多くの関数の例を提供しており、この章ではそれらをもう少し詳しく見ていきます。

```text
> import Prelude
> :type flip
forall a b c. (a -> b -> c) -> b -> a -> c

> :type const
forall a b. a -> b -> a
```

ファイルのトップレベルでは、等号の直前に引数を指定することで関数を定義することができます。

```haskell
add :: Int -> Int -> Int
add x y = x + y
```

バックスラッシュに続けて空白文字で区切られた引数名のリストを書くことで、関数をインラインで定義することもできます。PSCiで複数行の宣言を入力するには、 `：paste`コマンドを使用して"paste mode"に入ります。このモードでは、**Control-D**キーシーケンスを使用して宣言を終了します。

```text
> :paste
… add :: Int -> Int -> Int
… add = \x y -> x + y
… ^D
```

`PSCi`でこの関数が定義されていると、次のように関数の隣に２つの引数を空白で区切って書くことで、関数をこれらの引数に**適用**(apply)することができます。

```text
> add 10 20
30
```

## 量化された型

前の節ではPreludeで定義された関数の型をいくつか見てきました。たとえば `flip`関数は次のような型を持っていました。

```text
> :type flip
forall a b c. (a -> b -> c) -> b -> a -> c
```

この `forall`キーワードは、 `flip`が**全称量化された型**(universally quantified type)を持っていることを示しています。これは、 `a`や `b`、 `c`をどの型に置き換えても、 `flip`はその型でうまく動作するという意味です。

例えば、 `a`を `Int`、 `b`を `String`、 `c`を `String`というように選んでみたとします。この場合、 `flip`の型を次のように**特殊化**(specialize)することができます。

```text
(Int -> String -> String) -> String -> Int -> String
```

量化された型を特殊化したいということをコードで示す必要はありません。特殊化は自動的に行われます。たとえば、すでにその型の `flip`を持っていたかのように、次のように単に `flip`を使用することができます。

```text
> flip (\n s -> show n <> s) "Ten" 10

"10Ten"
```

`a`、 `b`、 `c`の型はどんな型でも選ぶことができるといっても、型の不整合は生じないようにしなければなりません。 `flip`に渡す関数の型は、他の引数の型と整合性がなくてはなりません。第２引数として文字列 `"Ten"`、第３引数として数 `10`を渡したのはそれが理由です。もし引数が逆になっているとうまくいかないでしょう。

```text
> flip (\n s -> show n <> s) 10 "Ten"

Could not match type Int with type String
```

## 字下げについての注意

JavaScriptとは異なり、PureScriptのコードは字下げの大きさに影響されます(indentation-sensitive)。これはHaskellと同じようになっています。コード内の空白の多寡は無意味ではなく、Cのような言語で中括弧によってコードのまとまりを示しているように、PureScriptでは空白がコードのまとまりを示すのに使われているということです。

宣言が複数行にわたる場合は、２つめの行は最初の行の字下げより深く字下げしなければなりません。

したがって、次は正しいPureScriptコードです。

```haskell
add x y z = x +
  y + z
```

しかし、次は正しいコードではありません。

```haskell
add x y z = x +
y + z
```

後者では、PureScriptコンパイラはそれぞれの行ごとにひとつ、つまり**2つ**の宣言であると構文解析します。

一般に、同じブロック内で定義された宣言は同じ深さで字下げする必要があります。例えば `PSCi`でlet文の宣言は同じ深さで字下げしなければなりません。次は正しいコードです。

```text
> :paste
… x = 1
… y = 2
… ^D
```

しかし、これは正しくありません。

```text
> :paste
… x = 1
…  y = 2
… ^D
```

PureScriptのいくつかの予約語（例えば `where`や `of`、 `let`）は新たなコードのまとまりを導入しますが、そのコードのまとまり内の宣言はそれより深く字下げされている必要があります。

```haskell
example x y z = foo + bar
  where
    foo = x * y
    bar = y * z
```

ここで `foo`や `bar`の宣言は `example`の宣言より深く字下げされていることに注意してください。

ただし、ソースファイルの先頭、最初の `module`宣言における予約語 `where`だけは、この規則の唯一の例外になっています。

## 独自の型の定義

PureScriptで新たな問題に取り組むときは、まずはこれから扱おうとする値の型の定義を書くことから始めるのがよいでしょう。最初に、住所録に含まれるレコードの型を定義してみます。

```haskell
type Entry = { firstName :: String, lastName :: String, address :: Address }
```

これは `Entry`という**型同義語**(type synonym、型シノニム)を定義しています。 型 `Entry`は等号の右辺と同じ型ということです。レコードの型はいずれも文字列である `firstName`、 `lastName`、 `phone`という３つのフィールドからなります。前者の２つのフィールドは型 `String`を持ち、 `address`は以下のように定義された型 `Address`を持っています。

```haskell
type Address = { street :: String, city :: String, state :: String }
```

それでは、２つめの型同義語も定義してみましょう。住所録のデータ構造としては、単に項目の連結リストとして格納することにします。

```haskell
type AddressBook = List Entry
```

`List Entry`は `Array Entry`とは同じではないということに注意してください。 `Array Entry`は住所録の項目の**配列**を意味しています。

## 型構築子と種

`List`は**型構築子**(type constructor、型コンストラクタ)の一例になっています。 `List`そのものは型ではなく、何らかの型 `a`があるとき `List a`が型になっています。つまり、 `List`は**型引数**(type argument)`a`をとり、新たな型 `List a`を構築するのです。

ちょうど関数適用と同じように、型構築子は他の型に並べることで適用されることに注意してください。型 `List　Entry`は実は型構築子 `List`が型 `Entry`に**適用**されたものです。これは住所録項目のリストを表しています。

(型注釈演算子 `::`を使って)もし型 `List`の値を間違って定義しようとすると、今まで見たことのないような種類のエラーが表示されるでしょう。

```text
> import Data.List
> Nil :: List
In a type-annotated expression x :: t, the type t must have kind Type
```

これは**種エラー**(kind error)です。値がその**型**で区別されるのと同じように、型はその**種**(kind)によって区別され、間違った型の値が**型エラー**になるように、**間違った種**の型は種エラーを引き起こします。

`Number`や `String`のような、値を持つすべての型の種を表す `Type`と呼ばれる特別な種があります。

型構築子にも種があります。たとえば、種 `Type -> Type`はちょうど `List`のような型から型への関数を表しています。ここでエラーが発生したのは、値が種 `Type`であるような型を持つと期待されていたのに、 `List`は種 `Type -> Type`を持っているためです。

`PSCi`で型の種を調べるには、 `:kind`命令を使用します。例えば次のようになります。

```text
> :kind Number
Type

> import Data.List
> :k List
Type -> Type

> :kind List String
Type
```

PureScriptの**種システム**は他にも面白い種に対応していますが、それらについては本書の他の部分で見ていくことになるでしょう。

## 住所録の項目の表示

それでは最初に、文字列で住所録の項目を表現するような関数を書いてみましょう。まずは関数に型を与えることから始めます。型の定義は省略することも可能ですが、ドキュメントとしても役立つので型を書いておくようにすると良いでしょう。型宣言は関数の名前とその型を `::`記号で区切るようにして書きます。

```haskell
showEntry :: Entry -> String
```

`showEntry`は引数として `Entry`を取り `string`を返す関数であるということを、この型シグネチャは言っています。 `showEntry`の定義は次のとおりです。

```haskell
showEntry entry = entry.lastName <> ", " <>
                  entry.firstName <> ": " <> 
                  showAddress entry.address
```

この関数は `Entry`レコードの３つのフィールドを連結し、単一の文字列にします。ここで使用される `showAddress`は `address`フィールドを連接し、単一の文字列にする関数です。 `showAddress`の定義は次のとおりです。

```haskell
showAddress :: Address -> String
showAddress addr = addr.street <> ", " <>
                   addr.city <> ", " <>
                   addr.state
```

関数定義は関数の名前で始まり、引数名のリストが続きます。関数の結果は等号の後ろに定義します。フィールドはドットに続けてフィールド名を書くことで参照することができます。PureScriptでは、文字列連結はJavaScriptのような単一のプラス記号ではなく、ダイアモンド演算子（ `<>`）を使用します。

## はやめにテスト、たびたびテスト

`PSCi`対話式処理系では反応を即座に得られるので、試行錯誤を繰り返したいときに向いています。それではこの最初の関数が正しく動作するかを `PSCi`を使用して確認してみましょう。

まず、これまで書かれたコードをビルドします。

```text
$ pulp build
```

次に、 `PSCi`を起動し、この新しいモジュールをインポートするために `import`命令を使います。

```text
$ pulp build

> import Data.AddressBook
```

レコードリテラルを使うと、住所録の項目を作成することができます。レコードリテラルはJavaScriptの無名オブジェクトと同じような構文で名前に束縛します。

```text
> address = { street: "123 Fake St.", city: "Faketown", state: "CA" }
```

​それでは、この例に関数を適用してみてください。

```text
> showAddress address

"123 Fake St., Faketown, CA"
```

そして、例で作成した `address`を含む住所録の `entry`レコードを作成し `showEntry`に適用させましょう。

```text
> entry = { firstName: "John", lastName: "Smith", address: address }
> showEntry entry

"Smith, John: 123 Fake St., Faketown, CA"
```

## 住所録の作成

今度は住所録の操作を支援する関数をいくつか書いてみましょう。空の住所録を表す値として、空のリストを使います。

```haskell
emptyBook :: AddressBook
emptyBook = empty
```

既存の住所録に値を挿入する関数も必要でしょう。この関数を `insertEntry`と呼ぶことにします。関数の型を与えることから始めましょう。

```haskell
insertEntry :: Entry -> AddressBook -> AddressBook
```

`insertEntry`は、最初の引数として `Entry`、第二引数として `AddressBook`を取り、新しい `AddressBook`を返すということを、この型シグネチャは言っています。

既存の `AddressBook`を直接変更することはしません。その代わりに、同じデータが含まれている新しい `AddressBook`を返すようにします。このように、 `AddressBook`は**永続データ構造**(persistent data structure)の一例となっています。これはPureScriptにおける重要な考え方です。変更はコードの副作用であり、コードの振る舞いについての判断するのを難しくします。そのため、我々は可能な限り純粋な関数や不変のデータを好むのです。

`Data.List`の `Cons`関数を使用すると `insertEntry`を実装できます。 `PSCi`を起動し `:type`コマンドを使って、この関数の型を見てみましょう。

```text
$ pulp repl

> import Data.List
> :type Cons

forall a. a -> List a -> List a
```

`Cons`は、なんらかの型 `a`の値と、型 `a`を要素に持つリストを引数にとり、同じ型の要素を持つ新しいリストを返すということを、この型シグネチャは言っています。 `a`を `Entry`型として特殊化してみましょう。

```haskell
Entry -> List Entry -> List Entry
```

しかし、 `List Entry`はまさに `AddressBook`ですから、次と同じになります。

```haskell
Entry -> AddressBook -> AddressBook
```

今回の場合、すでに適切な入力があります。 `Entry`と `AddressBook`に `Cons`を適用すると、新しい `AddressBook`を得ることができます。これこそまさに私たちが求めていた関数です！

`insertEntry`の実装は次のようになります。

```haskell
insertEntry entry book = Cons entry book
```

等号の左側にある２つの引数 `entry`と `book`がスコープに導入されますから、これらに `Cons`関数を適用して結果の値を作成しています。

## カリー化された関数

PureScriptでは、関数は常にひとつの引数だけを取ります。 `insertEntry`関数は２つの引数を取るように見えますが、これは実際には**カリー化された関数**(curried function)の一例となっています。

`insertEntry`の型に含まれる `->`は右結合の演算子であり、つまりこの型はコンパイラによって次のように解釈されます。

```haskell
Entry -> (AddressBook -> AddressBook)
```

すなわち、 `insertEntry`は関数を返す関数である、ということです！この関数は単一の引数 `Entry`を取り、それから単一の引数 `AddressBook`を取り新しい `AddressBook`を返す新しい関数を返すのです。

これは例えば、最初の引数だけを与えると `insertEntry`を**部分適用**(partial application)できることを意味します。 `PSCi`でこの結果の型を見てみましょう。

```text
> :type insertEntry example

AddressBook -> AddressBook
```

期待したとおり、戻り値の型は関数になっていました。この結果の関数に、ふたつめの引数を適用することもできます。

```text
> :type (insertEntry example) emptyBook
AddressBook
```

ここで括弧は不要であることにも注意してください。次の式は同等です。

```text
> :type insertEntry example emptyBook
AddressBook
```

これは関数適用が左結合であるためで、なぜ単に空白で区切るだけで関数に引数を与えることができるのかも説明にもなっています。

本書では今後、「２引数の関数」というように表現することがあることに注意してください。これはあくまで、最初の引数を取り別の関数を返す、カリー化された関数を意味していると考えてください。

今度は `insertEntry`の定義について考えてみます。

```haskell
insertEntry :: Entry -> AddressBook -> AddressBook
insertEntry entry book = Cons entry book
```

もし式の右辺に明示的に括弧をつけるなら、 `（Cons entry）book`となります。 `insertEntry entry`はその引数が単に関数 `(Cons entry)`に渡されるような関数だということです。この2つの関数はどんな入力についても同じ結果を返しますから、つまりこれらは同じ関数です！よって、両辺から引数 `book`を削除できます。

```haskell
insertEntry :: Entry -> AddressBook -> AddressBook
insertEntry entry = Cons entry
```

そして、同様の理由で両辺から `entry`も削除することができます。

```haskell
insertEntry :: Entry -> AddressBook -> AddressBook
insertEntry = Cons
```

この処理は**イータ変換**(eta conversion)と呼ばれ、引数を参照することなく関数を定義する**ポイントフリー形式**(point-free form)へと関数を書き換えるのに使うことができます。

`insertEntry`の場合には、イータ変換によって「 `insertEntry`は単にリストに対する `cons`だ」と関数の定義はとても明確になりました。しかしながら、常にポイントフリー形式のほうがいいのかどうかには議論の余地があります。

## あなたの住所録は？

最小限の住所録アプリケーションの実装で必要になる最後の関数は、名前で人を検索し適切な `Entry`を返すものです。これは小さな関数を組み合わせることでプログラムを構築するという、関数型プログラミングで鍵となる考え方のよい応用例になるでしょう。

まずは住所録をフィルタリングし、該当する姓名を持つ項目だけを保持するようにするのがいいでしょう。それから、結果のリストの先頭の(head)要素を返すだけです。

この大まかな仕様に従って、この関数の型を計算することができます。まず `PSCi`を起動し、 `filter`関数と `head`関数の型を見てみましょう。

```text
$ pulp repl

> import Data.List
> :type filter

forall a. (a -> Boolean) -> List a -> List a

> :type head

forall a. List a -> Maybe a
```

型の意味を理解するために、これらの2つの型の一部を取り出してみましょう。

`filter`はカリー化された２引数の関数です。最初の引数は、リストの要素を取り `Boolean`値を結果として返す関数です。第２引数は要素のリストで、返り値は別のリストです。

`head`は引数としてリストをとり、 `Maybe a`という今まで見たことがないような型を返します。 `Maybe a`は型 `a`のオプショナルな値、つまり `a`の値を持つか持たないかのどちらかの値を示しており、JavaScriptのような言語で値がないことを示すために使われる `null`の型安全な代替手段を提供します。これについては後の章で詳しく扱います。

`filter`と `head`の全称量化された型は、PureScriptコンパイラによって次のように**特殊化**(specialized)されます。

```haskell
filter :: (Entry -> Boolean) -> AddressBook -> AddressBook

head :: AddressBook -> Maybe Entry
```

検索する関数の引数として姓と名前を渡す必要があるのもわかっています。

`filter`に渡す関数も必要になることもわかります。この関数を `filterEntry`と呼ぶことにしましょう。 `filterEntry`は `Entry -> Boolean`という型を持っています。 `filter filterEntry`という関数適用の式は、 `AddressBook -> AddressBook`という型を持つでしょう。もしこの関数の結果を `head`関数に渡すと、型 `Maybe Entry`の結果を得ることになります。

これまでのことをまとめると、この `findEntry`関数の妥当な型シグネチャは次のようになります。

```haskell
findEntry :: String -> String -> AddressBook -> Maybe Entry
```

`findEntry`は、姓と名前の2つの文字列、および `AddressBook`を引数にとり、 `Maybe Entry`という型の値を結果として返すということを、この型シグネチャは言っています。結果の `Maybe Entry`という型は、名前が住所録で発見された場合にのみ `Entry`の値を持ちます。

そして、 `findEntry`の定義は次のようになります。

```haskell
findEntry firstName lastName book = head $ filter filterEntry book
  where
    filterEntry :: Entry -> Boolean
    filterEntry entry = entry.firstName == firstName && entry.lastName == lastName
```

一歩づつこのコードの動きを調べてみましょう。

`findEntry`は、どちらも文字列型である `firstName`と `lastName`、 `AddressBook`型の `book`という3つの名前をスコープに導入します

定義の右辺では `filter`関数と `head`関数が組み合わされています。まず項目のリストをフィルタリングし、その結果に `head`関数を適用しています。

真偽型を返す関数 `filterEntry`は `where`節の内部で補助的な関数として定義されています。このため、 `filterEntry`関数はこの定義の内部では使用できますが、外部では使用することができません。また、 `filterEntry`はそれを包む関数の引数に依存することができ、 `filterEntry`は指定された `Entry`をフィルタリングするために引数 `firstName`と `lastName`を使用しているので、 `filterEntry`が `findEntry`の内部にあることは必須になっています。

最上位での宣言と同じように、必ずしも `filterEntry`の型シグネチャを指定しなくてもよいことに注意してください。ただし、ドキュメントとしても役に立つので型シグネチャを書くことは推奨されています。

## 中置の関数適用

上でみた `findEntry`のコードでは、少し異なる形式の関数適用が使用されています。 `head`関数は中置の `$`演算子を使って式 `filter filterEntry book`に適用されています。

これは `head (filter filterEntry book)`という通常の関数適用と同じ意味です。

`($)`はPreludeで定義されている `apply`関数の別名で、次のように定義されています。

```haskell
apply :: forall a b. (a -> b) -> a -> b
apply f x = f x

infixr 0 apply as $
```

ここで、 `apply`は関数と値をとり、その値にその関数を適用します。 `infixr`キーワードは `($)`を `apply`の別名として定義します。

しかし、なぜ通常の関数適用の代わりに `$`を使ったのでしょうか？　その理由は `$`は右結合で優先順位の低い演算子だということにあります。これは、深い入れ子になった関数適用のための括弧を、 `$`を使うと取り除くことができることを意味します。

たとえば、ある従業員の上司の住所がある道路を見つける、次の入れ子になった関数適用を考えてみましょう。

```haskell
street (address (boss employee))
```

これは `$`を使用して表現すればずっと簡単になります。

```haskell
street $ address $ boss employee
```

## 関数合成

イータ変換を使うと `insertEntry`関数を簡略化できたのと同じように、引数をよく考察すると `findEntry`の定義を簡略化することができます。

引数 `book`が関数 `filter filterEntry`に渡され、この適用の結果が `head`に渡されることに注目してください。これは言いかたを変えれば、 `filter filterEntry`と `head`の**合成**(composition) に `book`は渡されるということです。

PureScriptの関数合成演算子は `<<<`と `>>>`です。前者は「逆方向の合成」であり、後者は「順方向の合成」です。

いずれかの演算子を使用して `findEntry`の右辺を書き換えることができます。逆順の合成を使用すると、右辺は次のようになります。

```haskell
(head <<< filter filterEntry) book
```

この形式なら最初の定義にイータ変換の技を適用することができ、 `findEntry`は最終的に次のような形式に到達します。

```haskell
findEntry firstName lastName = head <<< filter filterEntry
  where
    ...
```

右辺を次のようにしても同じです。

```haskell
filter filterEntry >>> head
```

どちらにしても、これは「 `findEntry`はフィルタリング関数と `head`関数の合成である」という `findEntry`関数のわかりやすい定義を与えます。

どちらの定義のほうがわかりやすいかの判断はお任せしますが、このように関数を部品として捉え、関数はひとつの役目だけをこなし、機能を関数合成で組み立てるというように考えると有用なことがよくあります。

## テスト、テスト、テスト……

これでこのアプリケーションの中核部分が完成しましたので、 `PSCi`を使って試してみましょう。

```text
$ pulp repl

> import Data.AddressBook
```

まずは空の住所録から項目を検索してみましょう（これは明らかに空の結果が返ってくることが期待されます）。

```text
> findEntry "John" "Smith" emptyBook

No type class instance was found for

    Data.Show.Show { firstName :: String
                   , lastName :: String
                   , address :: { street :: String
                                , city :: String
                                , state :: String
                                }
                   }
```

エラーです！でも心配しないでください。これは単に 型 `Entry`の値を文字列として出力する方法を `PSCi`が知らないという意味のエラーです。

`findEntry`の返り値の型は `Maybe Entry`ですが、これは手作業で文字列に変換することができます。

`showEntry`関数は `Entry`型の引数を期待していますが、今あるのは `Maybe Entry`型の値です。この関数は `Entry`型のオプショナルな値を返すことを忘れないでください。行う必要があるのは、オプショナルな値の中に項目の値が存在すれば `showEntry`関数を適用し、そうでなければ存在しないという値をそのまま伝播することです。

幸いなことに、Preludeモジュールはこれを行う方法を提供しています。 `map`演算子は `Maybe`のような適切な型構築子まで関数を「持ち上げる」ことができます（この本の後半で関手について説明するときに、この関数やそれに類似する他のものについて詳しく見ていきます）。

```text
> import Prelude
> map showEntry (findEntry "John" "Smith" emptyBook)

Nothing
```

今度はうまくいきました。この返り値 `Nothing`は、オプショナルな返り値に値が含まれていないことを示しています。期待していたとおりです。

もっと使いやすくするために、 `Entry`を文字列として出力するような関数を定義し、毎回 `showEntry`を使わなくてもいいようにすることもできます。

```haskell
printEntry firstName lastName book
  = map showEntry (findEntry firstName lastName book)
```

それでは空でない住所録を作成してもう一度試してみましょう。先ほどの項目の例を再利用します。

```text
> book1 = insertEntry entry emptyBook

> printEntry "John" "Smith" book1

Just ("Smith, John: 123 Fake St., Faketown, CA")
```

今度は結果が正しい値を含んでいました。 `book1`に別の名前で項目を挿入して、ふたつの名前がある住所録 `book2`を定義し、それぞれの項目を名前で検索してみてください。

## 演習

1. （簡単） `findEntry`関数の定義の主な部分式の型を書き下し、 `findEntry`関数についてよく理解しているか試してみましょう。たとえば、 `findEntry`の定義のなかにある `head`関数の型は `AddressBook -> Maybe Entry`と特殊化されています。 

1. （簡単） `findEntry`の既存のコードを再利用し、与えられた電話番号から `Entry`を検索する関数を書いてみましょう。また、 `PSCi`で実装した関数をテストしてみましょう。 

1. （やや難しい） 指定された名前が `AddressBook`に存在するかどうかを調べて真偽値で返す関数を書いてみましょう。 (**ヒント**：リストが空かどうかを調べる `Data.List.null`関数の型を `psci`で調べてみてみましょう)

1. （難しい） 姓名が重複している項目を住所録から削除する関数 `removeDuplicates`を書いてみましょう。 (**ヒント**：値どうしの等価性を定義する述語関数に基づいてリストから重複要素を削除する関数 `Data.List.nubBy`の型を、 `psci`を使用して調べてみましょう)

## まとめ

この章では、関数型プログラミングの新しい概念をいくつか導入しました。

- 対話的モード `PSCi`を使用して関数を調べるなど思いついたことを試す方法
- 検証や実装の道具としての型の役割
- 多引数関数を表現する、カリー化された関数の使用
- 関数合成で小さな部品を組み合わせてのプログラムの構築
- `where`節を利用したコードの構造化
- `Maybe`型を使用してnull値を回避する方法
- イータ変換や関数合成のような手法を利用した、よりわかりやすいコードへの再構成

次の章からは、これらの考えかたに基づいて進めていきます。
