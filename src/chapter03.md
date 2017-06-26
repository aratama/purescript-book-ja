# 関数とレコード

## この章の目標

この章では、関数およびレコードというPureScriptプログラムのふたつの構成要素を導入します。さらに、どのようにPureScriptプログラムを構造化するのか、どのように型をプログラム開発に役立てるかを見ていきます。　

電話番号の一覧を管理する簡単​​な電話帳アプリケーションを作成していきます。このコード例により、PureScriptの構文からいくつかの新しい概念を導入します。

このアプリケーションのフロントエンドは対話式処理系 `psci` を使うようにしますが、JavaScriptでフロントエンドを書くこともできるでしょう。

## プロジェクトの準備

この章のソースコードは`src/data/ PhoneBook.purs` というファイルに含まれています。このファイルは次のようなモジュール宣言とインポート一覧から始まります。

```haskell
module Data.PhoneBook where

import Data.List
import Data.Maybe

import Control.Plus (empty)
```

ここでは `purescript-lists`パッケージで提供されている `Data.List` モジュールをインポートしています。`purescript-lists`パッケージはbowerを使用してインストールすることができ、連結リストを使うために必要ないくつかの関数が含まれています。

`Data.Maybe` モジュールは、値が存在したりしなかったりするような、オプショナルな値を扱うためのデータ型と関数を定義しています。

`Control.Plus` モジュールには後ほど使う `em​​pty` 値が定義されています。このモジュールのインポート内容は括弧内で明示的に列挙されていることに注意してください。明示的な列挙はインポート内容の衝突を避けるのに役に立つので、一般に良い習慣です。

## 単純な型

JavaScriptのプリミティブ型に対応する組み込みデータ型として、PureScriptでは数値型と文字列型、真偽型の３つが定義されています。すべてのモジュールに暗黙にインポートされる `Prim`モジュールでこれらの型は定義されています。これらの型はそれぞれ `Number`、`String`、と `Boolean` と呼ばれ、`psci` の`:t` コマンドを使用すると簡単な値の型を確認できます。

```text
$ psci

> :t 1
Prim.Number

> :t "test"
Prim.String

> :t true
Prim.Boolean
```

PureScriptには他にも配列とレコード、関数の3つの組み込み型が定義されています。

配列はJavaScriptの配列に対応していますが、JavaScriptの配列とは異なり、PureScriptの配列のすべての要素は同じ型を持つ必要があります。

```text
> :t [1, 2, 3]
[Prim.Number]

> :t [true, false]
[Prim.Boolean]

> :t [1, false]
Cannot unify Prim.Number with Prim.Boolean.
```

最後の例で起きているエラーは型検証器によって報告されたもので、配列の2つの要素の型を**単一化**(Unification)しようとして失敗したこと示しています。

レコードはJavaScriptのオブジェクトに対応しており、レコードリテラルはJavaScriptのオブジェクトリテラルと同じ構文になっています。

```text
> let author = 
        { name: "Phil"
        , interests: ["Functional Programming", "JavaScript"] 
        }

> :t author
{ name :: Prim.String, interests :: [Prim.String] }
```

この型が示しているのは、オブジェクト`author`は、

- `String`型のフィールド`name`
- `[String]`つまり`String`の配列の型のフィールド`interests`

というふたつの**フィールド**(field)を持っているということです。

レコードのフィールドは、ドットに続けて参照したいフィールドのラベルを書くと参照することができます。

```text
> author.name
"Phil"

> author.interests
["Functional Programming","JavaScript"]
```

PureScriptの関数はJavaScriptのの関数に対応しています。PureScriptの標準ライブラリは多くの関数の例を提供しており、この章ではそれらをもう少し詳しく見ていきます。

```text
> :t Prelude.flip
forall a b c. (a -> b -> c) -> b -> a -> c

> :t Prelude.const
forall a b. a -> b -> a
```

ファイルのトップレベルでは、等号の直前に引数を指定することで関数を定義することができます。

```haskell
add :: Number -> Number -> Number
add x y = x + y
```

バックスラッシュにに続けて空白文字で区切られた引数名のリストを書くと、関数をインラインで定義することもできます。

```text
> let 
    add :: Number -> Number -> Number
    add = \x y -> x + y
```

`psci`でこの関数が定義されていると、次のように関数の隣に２つの引数を空白で区切って書くことで、関数をこれらの引数に**適用**(apply)することができます。

```text
> add 10 20
30
```

## 量化された型

前の節ではPreludeで定義された関数の型をいくつかの見てきました。たとえば`flip`関数は次のような型を持っていました。

```text
> :t Prelude.flip
forall a b c. (a -> b -> c) -> b -> a -> c
```

この`forall`キーワードは`flip`が**全称量化された型**(universally quantified type)を持っていることを示しています。これは、`a`や`b`、`c`をどの型に置き換えても、`flip`はその型でうまく動作するという意味です。

例えば、`a`を`Number`、`b`を`String`、`c`を`String`というように選んでみたとします。この場合、`flip`の型を次のように**特殊化**(specialize)することができます。

```text
(Number -> String -> String) -> String -> Number -> String
```

量化された型を特殊化したいということをコードで示す必要はありません。特殊化は自動的に行われます。たとえば、すでにその型の`flip`を持っていたかのように、次のように単に`flip`を使用することができます。

```text
> flip (\n s -> show n ++ s) "Ten" 10
  
"10Ten"
```

`a`、`b`、`c`の型はどんな型でも選ぶことができるといっても、型の不整合は生じないようにしなければなりません。`flip` に渡す関数の型は、他の引数の型と整合性がなくてはなりません。第２引数として文字列`"Ten"`、第３引数として数`10`を渡したのはそれが理由です。もし引数が逆になっているとうまくいかないでしょう。

```text
> flip (\n s -> show n ++ s) 10 "Ten"

Error in value 10:
Value does not have type Prim.String
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

一般に、同じブロック内で定義された宣言は同じ深さで字下げする必要があります。例えば`psci`でlet文の宣言は同じ深さで字下げしなければなりません。次は正しいコードです。

```text
> let x = 1
      y = 2
```

しかし、これは正しくありません。

```text
> let x = 1
       y = 2
```

PureScriptのいくつかの予約語（例えば `where`や` of`、`let`）は新たなコードのまとまりを導入しますが、そのコードのまとまり内の宣言はそれより深く字下げされている必要があります。

```haskell
example x y z = foo + bar
  where
  foo = x * y
  bar = y * z
```

ここで`foo`や` bar`の宣言は`example` の宣言より深く字下げされていることに注意してください。

ただし、ソースファイルの先頭、最初の `module`宣言における予約語`where`だけは、この規則の唯一の例外になっています。

## 独自の型の定義

PureScriptで新たな問題に取り組むときは、まずはこれから扱おうとする値の型の定義を書くことから始めるのがよいでしょう。最初に、電話帳に含まれるレコードの型を定義してみます。

```haskell
type Entry = { firstName :: String, lastName :: String, phone :: String }
```

これは`Entry`という**型同義語**(type synonym、型シノニム)を定義しています。 型`Entry`は等号の右辺と同じ型ということです。レコードの型はいずれも文字列である`firstName`、`lastName`、`phone`という３つのフィールドからなります。

それでは、２つめの型別名も定義してみましょう。電話帳のデータ構造として、単に項目の連結リストとして格納することにします。

```haskell
type PhoneBook = List Entry
```

`List Entry`は`[Entry]`とは同じではないということに注意してください。`[Entry]`は電話帳の項目の**配列**を意味しています。

## 型構築子と種

`List`は**型構築子**(type constructor、型コンストラクタ)の一例になっています。`List`そのものは型ではなく、何らかの型`a`があるとき`List a`が型になっています。つまり、 `List`は**型引数**(type argument) `a`をとり、新たな型`List a`を構築するのです。

ちょうど関数適用と同じように、型構築子は他の型に並べることで適用されることに注意してください。型`List　Entry`は実は型構築子`List`が型`Entry`に**適用**されたものです。これは電話帳項目のリストを表しています。

(型注釈演算子 `::` を使って)もし型`List`の値を間違って定義しようとすると、今まで見たことのないような種類のエラーが表示されるでしょう。

```text
> :i Data.List
> Nil :: List
Expected type of kind *, was * -> *
```

これは**種エラー**(kind error)です。値がその**型**で区別されるのと同じように、型はその**種**(kind)によって区別され、間違った型の値が**型エラー**になるように、**間違った種**の型は種エラーを引き起こします。

`Number`や`String`のような、値を持つすべての型の種を表す `*`と呼ばれる特別な種があります。

型構築子にも種があります。たとえば、種 `* -> *`はちょうど`List`のような型から型への関数を表しています。ここでエラーが発生したのは、値が種 `*`であるような型を持つと期待されていたのに、`List`は種 `* -> *`を持っているためです。

`psci`で型の種を調べるには、`:k`命令を使用します。例えば次のようになります。

```text
> :k Number
*

> :i Data.List
> :k List
* -> *

> :k List String
*
```

PureScriptの**種システム**は他にも面白い種に対応していますが、それらについては本書の他の部分で見ていくことになるでしょう。

## 電話帳の項目の表示

それでは最初に、文字列で電話帳の項目を表現するような関数を書いてみましょう。まずは関数に型を与えることから始めます。型の定義は省略することも可能ですが、ドキュメントとしても役立つので型を書いておくようにすると良いでしょう。型宣言は関数の名前とその型を`::`記号で区切るようにして書きます。

```haskell
showEntry :: Entry -> String
```

`showEntry`は引数として` Entry`を取り `string`を返す関数であるということを、この型シグネチャは言っています。 `showEntry`の定義は次のとおりです。

```haskell
showEntry entry = entry.lastName ++ ", " ++ 
                  entry.firstName ++ ": " ++ 
                  entry.phone
```

この関数は`Entry`レコードの３つのフィールドを連結し、単一の文字列にします。

関数定義は関数の名前で始まり、引数名のリストが続きます。関数の結果は等号の後ろに定義します。フィールドはドットに続けてフィールド名を書くことで参照することができます。PureScriptでは、文字列連結はJavaScriptのような単一のプラス記号ではなく、ダブルプラス演算子（`++`）を使用します。

## はやめにテスト、たびたびテスト

`psci` 対話式処理系では反応を即座に得られるので、試行錯誤を繰り返したいときに向いています。それではこの最初の関数が正しく動作するかを`psci`を使用して確認してみましょう。

まず、これまで書かれたコードをビルドします。

```text
$ grunt
```

次に、`psci`を起動し、この新しいモジュールをインポートするために`:i`命令を使います。

```text
$ psci

> :i Data.PhoneBook
```

レコードリテラルを使うと、電話帳の項目を作成することができます。レコードリテラルはJavaScriptの無名オブジェクトと同じような構文です。これを`let`式で名前に束縛します。

```text
> let example = { firstName: "John", lastName: "Smith", phone: "555-555-5555" }
```

（Ctrl+ Dで式をを終了することを忘れないようにしましょう）​​。それでは、この関数を`example`に適用してみてください。

```text
> showEntry example

"Smith, John: 555-555-5555"
```

おめでとうございます！PureScriptで初めて関数を書き、それを実行することができました。

## 電話帳の作成

今度は電話帳の操作を支援する関数をいくつか書いてみましょう。空の電話帳を表す値として、空のリストを使います。

```haskell
emptyBook :: PhoneBook
emptyBook = empty
```

既存の電話帳に値を挿入する関数も必要でしょう。この関数を `insertEntry`と呼ぶことにします。関数の型を与えることから始めましょう。

```haskell
insertEntry :: Entry -> PhoneBook -> PhoneBook
```

`insertEntry`は、最初の引数として` Entry`、第二引数として`PhoneBook`を取り、新しい` PhoneBook`を返すということを、この型シグネチャは言っています。

既存の `PhoneBook`を直接変更することはしません。その代わりに、同じデータが含まれている新しい `PhoneBook`を返すようにします。このように、 `PhoneBook`は**永続データ構造**(persistent data structure)の一例となっています。これはPureScriptにおける重要な考え方です。変更はコードの副作用であり、コードの振る舞いについての判断するのを難しくします。そのため、我々は可能な限り純粋な関数や不変のデータを好むのです。

`Data.List`の` Cons`関数を使用すると`insertEntry`を実装できます。`psci`を起動し`:t`コマンドを使って、この関数の型を見てみましょう。

```text
$ psci

> :t Data.List.Cons

forall a. a -> List a -> List a
```

`Cons`は、なんらかの型`a`の値と、型 `a`を要素に持つリストを引数にとり、同じ型の要素を持つ新しいリストを返すということを、この型シグネチャは言っています。`a`を`Entry`型として特殊化してみましょう。

```haskell
Entry -> List Entry -> List Entry
``` 

しかし、 `List Entry` はまさに` PhoneBook`ですから、次と同じになります。

```haskell
Entry -> PhoneBook -> PhoneBook
```

今回の場合、すでに適切な入力があります。 `Entry`、と` PhoneBook`に `Cons`を適用すると、新しい` PhoneBook`を得ることができます。これこそまさに私たちが求めていた関数です！

`insertEntry`の実装は次のようになります。

```haskell
insertEntry entry book = Cons entry book
```

等号の左側にある２つの引数 `entry`と` book`がスコープに導入されますから、これらに `Cons`関数を適用して結果の値を作成しています。

## カリー化された関数

PureScriptでは、関数は常にひとつの引数だけを取ります。`insertEntry`関数は２つの引数を取るように見えますが、これは実際には**カリー化された関数**(curried function)の一例となっています。

`insertEntry`の型に含まれる `->` は右結合の演算子であり、つまりこの型はコンパイラによって次のように解釈されます。

```haskell
Entry -> (PhoneBook -> PhoneBook)
```

すなわち、`insertEntry`は関数を返す関数である、ということです！この関数は単一の引数 `Entry`を取り、それから単一の引数` PhoneBook`を取り新しい `PhoneBook`を返す新しい関数を返すのです。

これは例えば、最初の引数だけを与えると`insertEntry`を**部分適用**(partial application)できることを意味します。`psci`でこの結果の型を見てみましょう。

```text
> :t insertEntry example

PhoneBook -> PhoneBook
```

期待したとおり、戻り値の型は関数になっていました。この結果の関数に、ふたつめの引数を適用することもできます。

```text
> :t (insertEntry example) emptyBook
PhoneBook
```

ここで括弧は不要であることにも注意してください。次の式は同等です。

```text
> :t insertEntry example emptyBook
PhoneBook
```

これは関数適用が左結合であるためで、なぜ単に空白で区切るだけで関数に引数を与えることができるのかも説明にもなっています。

本書では今後、「２引数の関数」というように表現することがあることに注意してください。これはあくまで、最初の引数を取り別の関数を返す、カリー化された関数を意味していると考えてください。

今度は`insertEntry` の定義について考えてみます。

```haskell
insertEntry :: Entry -> PhoneBook -> PhoneBook
insertEntry entry book = Cons entry book
```

もし式の右辺に明示的に括弧をつけるなら、 `（Cons entry）book` となります。`insertEntry entry` はその引数が単に関数`(Cons entry)`に渡されるような関数だということです。この2つの関数はどんな入力についても同じ結果を返しますから、つまりこれらは同じ関数です！よって、両辺から引数 `book`を削除できます。

```haskell
insertEntry :: Entry -> PhoneBook -> PhoneBook
insertEntry entry = Cons entry
```

そして、同様の理由で両辺から`entry` も削除することができます。

```haskell
insertEntry :: Entry -> PhoneBook -> PhoneBook
insertEntry = Cons
```

この処理は**イータ変換**(eta conversion)と呼ばれ、引数を参照することなく関数を定義する**ポイントフリー形式**(point-free form)へと関数を書き換えるのに使うことができます。

`insertEntry`の場合には、イータ変換によって「`insertEntry`は単にリストに対する`cons`だ」と関数の定義はとても明確になりました。しかしながら、常にポイントフリー形式のほうがいいのかどうかには議論の余地があります。

## あなたの電話番号は？

最小限の電話帳アプリケーションの実装で必要になる最後の関数は、名前で人を検索し適切な`Entry`を返すものです。これは小さな関数を組み合わせることでプログラムを構築するという、関数型プログラミングで鍵となる考え方のよい応用例になるでしょう。

まずは電話帳をフィルタリングし、該当する姓名を持つ項目だけを保持するようにするのがいいでしょう。それから、結果のリストの先頭の(head)要素を返すだけです。

この大まかな仕様に従って、この関数の型を計算することができます。まず `psci`を起動し、` filter`関数と`head`関数の型を見てみましょう。

```text
$ psci

> :t Data.List.filter

forall a. (a -> Boolean) -> List a -> List a

:t Data.List.head

forall a. List a -> Maybe a
```

型の意味を理解するために、これらの2つの型の一部を取り出してみましょう。

`filter`はカリー化された２引数の関数です。最初の引数は、リストの要素を取り`Boolean`値を結果として返す関数です。第２引数は要素のリストで、返り値は別のリストです。

`head`は引数としてリストをとり、`Maybe a`という今まで見たことがないような型を返します。`Maybe a`は型`a`のオプショナルな値、つまり`a`の値を持つか持たないかのどちらかの値を示しており、JavaScriptのような言語で値がないことを示すために使われる` null`の型安全な代替手段を提供します。これについては後の章で詳しく扱います。

`filter`と` head`の全称量化された型は、PureScriptコンパイラによって次のように**特殊化**されます。

```haskell
filter :: (Entry -> Boolean) -> PhoneBook -> PhoneBook

head :: PhoneBook -> Maybe Entry
```

検索する関数の引数として姓と名前をを渡す必要があるのもわかっています。

`filter`に渡す関数も必要になることもわかります。この関数を `filterEntry`と呼ぶことにしましょう。`filterEntry`は`Entry -> Boolean`という型を持っています。`filter filterEntry`という関数適用の式は、`PhoneBook -> PhoneBook`という型を持つでしょう。もしこの関数の結果を`head`関数に渡すと、型`Maybe Entry`の結果を得ることになります。

これまでのことをまとめると、この`findEntry`関数の妥当な型シグネチャは次のようになります。

```haskell
findEntry :: String -> String -> PhoneBook -> Maybe Entry
```

`findEntry` は、姓と名前の2つの文字列、および` PhoneBook`を引数にとり、`Maybe Entry`という型の値を結果として返すということを、この型シグネチャは言っています。結果の`Maybe Entry`という型は、名前が電話帳で発見された場合にのみ`Entry`の値を持ちます。

そして、`findEntry` の定義は次のようになります。

```haskell
findEntry firstName lastName book = head $ filter filterEntry book
  where
  filterEntry :: Entry -> Boolean
  filterEntry entry = entry.firstName == firstName && entry.lastName == lastName
```

一歩づつこのコードの動きを調べてみましょう。

`findEntry`は、どちらも文字列型である`firstName`と` lastName`、`PhoneBook`型の`book`という3つの名前をスコープに導入します

定義の右辺では`filter`関数と` head`関数が組み合わされています。まず項目のリストをフィルタリングし、その結果に`head`関数を適用しています。

真偽型を返す関数 `filterEntry`は`where`節の内部で補助的な関数として定義されています。このため、 `filterEntry`関数はこの定義の内部では使用できますが、外部では使用することができません。また、`filterEntry`はそれを包む関数の引数に依存することができ、`filterEntry`は指定された` Entry`をフィルタリングするために引数 `firstName`と` lastName`を使用しているので、`filterEntry`が`findEntry`の内部にあることは必須になっています。

最上位での宣言と同じように、必ずしも`filterEntry`の型シグネチャを指定しなくてもよいことに注意してください。ただし、ドキュメントとしても役に立つので型シグネチャを書くことは推奨されています。

## 中置の関数適用

上でみた `findEntry`のコードでは、少し異なる形式の関数適用が使用されています。`head`関数は中置の `$`演算子を使って式 `filter filterEntry book`に適用されています。

これは`head (filter filterEntry book)`という通常の関数適用と同じ意味です。

`($)`はPreludeで定義されている通常の関数です。`($)`は次のように定義されています。

```haskell
($) :: forall a b. (a -> b) -> a -> b
($) f x = f x
```

つまり、 `($)`は関数と値をとり、その値にその関数を適用します。

しかし、なぜ通常の関数適用の代わりに `$`を使ったのでしょうか？その理由は `$`は右結合で優先順位の低い演算子だということにあります。これは、深い入れ子になった関数適用のための括弧を、`$`を使うと取り除くことができることを意味します。

たとえば、ある従業員の上司の住所がある道路を見つける、次の入れ子になった関数適用を考えてみましょう。

```haskell
street (address (boss employee))
```

これは`$`を使用して表現すればずっと簡単になります。

```haskell
street $ address $ boss employee
```

## 関数合成

イータ変換を使うと `insertEntry`関数を簡略化できたのと同じように、引数をよく考察すると`findEntry`の定義を簡略化することができます。

引数`book`が関数`filter filterEntry`に渡され、この適用の結果が `head`に渡されることに注目してください。これは言いかたを変えれば、`filter filterEntry`と`head`の**合成**(composition) に`book`は渡されるということです。

PureScriptの関数合成演算子は `<<<`と `>>>`です。前者は「逆方向の合成」であり、後者は「順方向の合成」です。

いずれかの演算子を使用して `findEntry`の右辺を書き換えることができます。逆順の合成を使用すると、右辺は次のようになります。

```
(head <<< filter filterEntry) book
```

この形式なら最初の定義にイータ変換の技を適用することができ、`findEntry` は最終的に次のような形式に到達します。

```haskell
findEntry firstName lastName = head <<< filter filterEntry
  where
  ...
```

右辺を次のようにしても同じです。

```haskell
filter filterEntry >>> head
```

どちらにしても、これは「 `findEntry`はフィルタリング関数と` head`関数の合成である」という `findEntry`関数のわかりやすい定義を与えます。

どちらの定義のほうがわかりやすいかの判断はお任せしますが、このように関数を部品として捉え、関数はひとつの役目だけをこなし、機能を関数合成で組み立てるというように考えると有用なことがよくあります。

## テスト、テスト、テスト……

これでこのアプリケーションの中核部分が完成しましたので、 `psci`を使って試してみましょう。

```text
$ psci

> :i Data.PhoneBook 
```

まずは空の電話帳から項目を検索してみましょう（これは明らかに空の結果が返ってくることが期待されます）。

```text
> findEntry "John" "Smith" emptyBook

Error in declaration main
No instance found for Prelude.Show (Data.Maybe.Maybe Data.PhoneBook.Entry<>)
```

エラーです！でも心配しないでください。これは単に 型` Entry`の値を文字列として出力する方法を`psci`が知らないという意味のエラーです。

`findEntry`の返り値の型は `Maybe Entry`ですが、これは手作業で文字列に変換することができます。

 `showEntry`関数は`Entry`型の引数を期待していますが、今あるのは`Maybe Entry` 型の値です。この関数は`Entry` 型のオプショナルな値を返すことを忘れないでください。行う必要があるのは、オプショナルな値の中に項目の値が存在すれば `showEntry`関数を適用し、そうでなければ存在しないという値をそのまま伝播することです。

幸いなことに、Preludeモジュールはこれを行う方法を提供しています。`<$>`演算子は`Maybe` のような適切な型構築子まで関数を「持ち上げる」ことができます（この本の後半で関手について説明するときに、この関数やそれに類似する他のものについて詳しく見ていきます）。

```text
> showEntry <$> findEntry "John" "Smith" emptyBook

Nothing
```

今度はうまくいきました。この返り値 `Nothing`は、オプショナルな返り値に値が含まれていないことを示しています。期待していたとおりです。

もっと使いやすくするために、`Entry`を文字列として出力するような関数を定義し、毎回`showEntry`を使わなくてもいいようにすることもできます。

```text
> let printEntry firstName lastName book = showEntry <$> findEntry firstName lastName book
```

それでは空でない電話帳を作成してもう一度試してみましょう。先ほどの項目の例を再利用します。

```text
> let john = { firstName: "John", lastName: "Smith", phone: "555-555-5555" }

> let book1 = insertEntry john emptyBook

> printEntry "John" "Smith" book1

Just ("Smith, John: 555-555-5555")
```

今度は結果が正しい値を含んでいました。`book1` に別の名前で項目を挿入して、ふたつの名前がある電話帳`book2`を定義し、それぞれの項目を名前で検索してみてください。

> ## 演習　{-}
> 
> 1. （簡単）`findEntry`関数の定義の主な部分式の型を書き下し、`findEntry`関数についてよく理解しているか試してみましょう。たとえば、`findEntry`の定義のなかにある`head`関数の型は`List Entry -> Maybe Entry`と特殊化されています。 
> 
> 1. （簡単） `findEntry`の既存のコードを再利用し、与えられた電話番号から `Entry` を検索する関数を書いてみましょう。また、`psci` で実装した関数をテストしてみましょう。 
> 
> 1. （やや難しい） 指定された名前が`PhoneBook`に存在するかどうかを調べて真偽値で返す関数を書いてみましょう。**ヒント**： リストが空かどうかを調べる`Data.List.null`関数の型を` psci`で調べてみてみましょう。 
> 
> 1. （難しい） 姓名が重複している項目を電話帳から削除する関数 `removeDuplicates` を書いてみましょう。**ヒント**： 値どうしの等価性を定義する述語関数に基づいてリストから重複要素を削除する関数 `List.nubBy`の型を、` psci`を使用して調べてみましょう。 

## まとめ

この章では、関数型プログラミングの新しい概念をいくつか導入しました。

- 不変データ型と純粋な関数の重要性
- 対話的モード `psci`を使用して関数を調べたり思いついたことを試す方法
- 検証や実装の道具としての型の役割
- 多引数関数を表現する、カリー化された関数の使用
- 関数合成で小さな部品を組み合わせてのプログラムの構築
- `where`節を利用したコードの構造化
- `Maybe`型を使用してnull値を回避する方法
- イータ変換や関数合成のような手法を利用した、よりわかりやすいコードへの再構成

次の章からは、これらの考えかたに基づいて進めていきます。



