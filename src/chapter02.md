# 開発環境の準備

## この章の目標

この章の目標は、作業用のPureScript開発環境を準備し、最初のPureScriptプログラムを書くことです。

これから書く最初のコードはごく単純なPureScriptライブラリで、直角三角形の対角線の長さを計算する関数ひとつだけを提供します。

## 導入

PureScript開発環境を準備するために、次のツールを使います。

-  [`purs`](http://purescript.org) -  PureScriptコンパイラ本体
-  [`npm`](http://npmjs.org) - 残りの開発ツールをインストールできるようにする、Nodeパッケージマネージャ
-  [`Pulp`](https://github.com/purescript-contrib/pulp) ​​- さまざまな作業をパッケージマネージャと連動して自動化するコマンドラインツール


この章ではこれらのツールのインストール方法と設定を説明します。

## PureScriptのインストール

PureScriptコンパイラをインストールするときにお勧めなのは、[PureScriptのウェブサイト](http://purescript.org)からバイナリ配布物としてダウンロードする方法です。PureScriptコンパイラおよび関連する実行ファイルが、パス上で利用できるかどうか確認をしてください。試しに、コマンドラインでPureScriptコンパイラを実行してみましょう。

```text
$ purs
```

PureScriptコンパイラをインストールする他の選択肢としては、次のようなものがあります。

- NPMを使用する。`npm install -g purescript`
- ソースコードからコンパイルを行う。この方法については、PureScriptのWebサイトが参考になります。

## 各ツールのインストール

もし[NodeJS](http://nodejs.org/)がインストールされていないなら、NodeJSをインストールする必要があります。そうするとシステムに `npm`パッケージマネージャもインストールされるはずです。 `npm`がインストールされ、パス上で利用可能であることを確認してください。

`npm`がインストールされたら、 `pulp`と `bower`もインストールする必要があります。プロジェクトがどこで作業しているかにかかわらずこれらのコマンドラインツールが利用可能であるようにするため、通常はグローバルにインストールしておくのがいいでしょう。

```text
$ npm install -g pulp bower
```

これで、最初のPureScriptプロジェクトを作成するために必要なすべてのツールの用意ができたことになります。

## Hello, PureScript!

まずはシンプルに始めましょう。PureScriptコンパイラ`pulp`を直接使用して、基本的なHello World! プログラムをコンパイルします。
最初に空のディレクトリ`my-project`を作成し、そこで`pulp init`を実行します。

```text
$ mkdir my-project
$ cd my-project
$ pulp init

* Generating project skeleton in ~/my-project

$ ls

bower.json	src		test
```

Pulpは`src`と`test`という2つのディレクトリと設定ファイル`bower.json`を作成してくれます。`src`ディレクトリにはソースコードファイルを保存し、`test`ディレクトリにはテストコードファイルを保存します。`test`ディレクトリはこの本の後半で使います。

`src/Main.purs`という名前のファイルに、以下のコードを貼り付けてください。

```haskell
module Main where

import Control.Monad.Eff.Console

main = log "Hello, World!"
```

これは小さなサンプルコードですが、​​いくつかの重要な概念を示しています。

- すべてのソースファイルはモジュールヘッダから始まります。モジュール名は、ドットで区切られた大文字で始まる1つ以上の単語から構成されています。ここではモジュール名としてひとつの単語だけが使用されていますが、 `My.First.Module`というようなモジュール名も有効です。
- モジュールは、モジュール名の各部分を区切るためのドットを含めた、完全な名前を使用してインポートされます。ここでは `log`関数を提供する `Control.Monad.Eff.Console`モジュールをインポートしています。
-  この `main`プログラムの定義本体は、関数適用の式になっています。PureScriptでは、関数適用は関数名のあとに引数を空白で区切って書くことで表します。

それではこのコードをビルドして実行してみましょう。次のコマンドを実行します。

```text
$ pulp run

* Building project in ~/my-project
* Build successful.
Hello, World!
```

おめでとうございます!　はじめてPureScriptで作成されたプログラムのコンパイルと実行ができました。

## ブラウザ向けのコンパイル

Pulpは `pulp browserify`を実行して、PureScriptコードをブラウザで使うことに適したJavaScriptに変換することができます。

```text
$ pulp browserify

* Browserifying project in ~/my-project
* Building project in ~/my-project
* Build successful.
* Browserifying...
```

これに続いて、大量のJavaScriptコードがコンソールに表示されます。 これは[Browserify](http://browserify.org/)の出力で、**Prelude**と呼ばれる標準のPureScriptライブラリに加え、`src`ディレクトリのコードにも適用されます。このJavaScriptコードをファイルに保存し、HTML文書に含めることもできます。これを試しに実行してみると、ブラウザのコンソールに"Hello、World！"という文章が出力されます。

## 使用されていないコードを取り除く

Pulpは代替コマンド `pulp build`を提供しています。 `-O`オプションで**未使用コードの削除**を適用すると、不要なJavaScriptを出力から取り除くことができます。

```text
$ pulp build -O --to output.js

* Building project in ~/my-project
* Build successful.
* Bundling Javascript...
* Bundled.
```
この場合も、生成されたコードはHTML文書で使用できます。 `output.js`を開くと、次のようなコンパイルされたモジュールがいくつか表示されます。

```javascript
(function(exports) {
  "use strict";

  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];

  var main = Control_Monad_Eff_Console.log("Hello, World!");
  exports["main"] = main;
})(PS["Main"] = PS["Main"] || {});
```

ここでPureScriptコンパイラがJavaScriptコードを生成する方法の要点が示されています。

- すべてのモジュールはオブジェクトに変換され、そのオブジェクトにはそのモジュールのエクスポートされたメンバが含まれています。モジュールは即時関数パターンによってスコープが限定されたコードで初期化されています。
- PureScriptは可能な限り変数の名前をそのまま使おうとします。
- PureScriptにおける関数適用は、そのままJavaScriptの関数適用に変換されます。
- 引数のない単純な呼び出しとしてメインメソッド呼び出しが生成され、すべてのモジュールが定義された後に実行されます。
- PureScriptコードはどんな実行時ライブラリにも依存しません。コンパイラによって生成されるすべてのコードは、あなたのコードが依存するいずれかのPureScriptモジュールをもとに出力されているものです。

PureScriptはシンプルで理解しやすいコードを生成すること重視しているので、これらの点は大切です。実際に、ほとんどのコード生成処理はごく軽い変換です。PureScriptについての理解が比較的浅くても、ある入力からどのようなJavaScriptコードが生成されるかを予測することは難しくありません。

## CommonJSモジュールのコンパイル

pulpは、PureScriptコードからCommonJSモジュールを生成するためにも使用できます。 これは、NodeJSを使用する場合やCommonJSモジュールを使用してコードを小さなコンポーネントに分割する大きなプロジェクトを開発する場合に便利です。

CommonJSモジュールをビルドするには、（ `-O`オプションなしで） `pulp build`コマンドを使います。

```text
$ pulp build

* Building project in ~/my-project
* Build successful.
```

生成されたモジュールはデフォルトで `output`ディレクトリに置かれます。 各PureScriptモジュールは、それ自身のサブディレクトリにある独自のCommonJSモジュールにコンパイルされます。

## Bowerによる依存関係の追跡

この章の目的となっている `diagonal`関数を書くためには、平方根を計算できるようにする必要があります。 `purescript-math`パッケージにはJavaScriptの `Math`オブジェクトのプロパティとして定義されている関数の型定義が含まれていますので、 `purescript-math`パッケージをインストールしてみましょう。 `npm`の依存関係でやったのと同じように、次のようにコマンドラインに入力すると直接このパッケージをダウンロードできます。

```text
$ bower install purescript-math --save
```

`--save`オプションは依存関係を `bower.json`設定ファイルに追加させます。

`purescript-math`ライブラリは、依存するライブラリと一緒に `bower_components`サブディレクトリにインストールされます。

## 対角線の長さの計算

それでは外部ライブラリの関数を使用する例として `diagonal`関数を書いてみましょう。

まず、 `src/Main.purs`ファイルの先頭に次の行を追加し、 `Math`モジュールをインポートします。

```haskell
import Math (sqrt)
```

また、数値の加算や乗算のようなごく基本的な演算を定義する `Prelude`モジュールをインポートすることも必要です。

```haskell
import Prelude
```

そして、次のように `diagonal`関数を定義します。

```haskell
diagonal w h = sqrt (w * w + h * h)
```

この関数の型を定義する必要はないことに注意してください。 `diagonal`は2つの数を取り数を返す関数である、とコンパイラは推論することができます。しかし、ドキュメントとしても役立つので、通常は型注釈を提供しておくことをお勧めします。

それでは、新しい `diagonal`関数を使うように `main`関数も変更してみましょう。

```haskell
main = logShow (diagonal 3.0 4.0)
```

`pulp run`を使用して、モジュールを再コンパイルします。

```text
$ pulp run

* Building project in ~/my-project
* Build successful.
5.0
```

## 対話式処理系を使用したコードのテスト

PureScriptコンパイラには `PSCi`と呼ばれる対話式のREPL(Read-eval-print loop)が付属しています。 `PSCi`はコードをテストなど思いついたことを試すのにとても便利です。それでは、 `psci`を使って `diagonal`関数をテストしてみましょう。

`pulp repl`コマンドを使ってソースモジュールを自動的に `PSCi`にロードすることができます。

```text
$ pulp repl
>
```

コマンドの一覧を見るには、 `:?`と入力します。

```text
> :?
The following commands are available:

    :?                        Show this help menu
    :quit                     Quit PSCi
    :reset                    Reset
    :browse      <module>     Browse <module>
    :type        <expr>       Show the type of <expr>
    :kind        <type>       Show the kind of <type>
    :show        import       Show imported modules
    :show        loaded       Show loaded modules
    :paste       paste        Enter multiple lines, terminated by ^D
```

Tabキーを押すと、自分のコードで利用可能なすべての関数、及びBowerの依存関係とプレリュードモジュールのリストをすべて見ることができるはずです。

`Prelude`モジュールを読み込んでください。

```text
> import Prelude
```

幾つか数式を評価してみてください。 `PSCi`で評価を行うには、1行以上の式を入力し、Ctrl+ Dで入力を終了します。

```text
> 1 + 2
3

> "Hello, " <> "World!"
"Hello, World!"
```

それでは `PSCi`で `diagonal`関数を試してみましょう。

```text
> import Main
> diagonal 5.0 12.0

13.0
```

また、 `PSCi`で関数を定義することもできます。

```text
> double x = x * 2

> double 10
20
```

コード例の構文がまだよくわからなくても心配はいりません。 この本を読み進めるうちにわかるようになっていきます。

最後に、 `:type`コマンドを使うと式の型を確認することができます。

```text
> :type true
Boolean

> :type [1, 2, 3]
Array Int
```

`PSCi`で試してみてください。もしどこかでつまずいた場合は、メモリ内にあるコンパイル済みのすべてのモジュールをアンロードするリセットコマンド `：reset`を使用してみてください。

## 演習
 
1. (簡単) `Math`モジュールで定義されている `pi`定数を使用し、指定された半径の円の面積を計算する関数 `circleArea`を書いてみましょう。また、 `PSCi`を使用してその関数をテストしてください。 (**ヒント**： `import math`文を修正して、 `pi`をインポートすることを忘れないようにしましょう)
1. (やや難しい) `purecript-globals`パッケージを依存関係としてインストールするには、`bower install`を使います。PSCiでその機能を試してみてください。 (**ヒント**： PSCiの `：browse`コマンドを使うと、モジュールの内容を閲覧することができます)

## まとめ

この章では、Pulpツールを使用して簡単なPureScriptプロジェクトを設定しました。

また、最初のPureScript関数を書き、コンパイルし、NodeJSを使用して実行することができました。

以降の章では、コードをコンパイルやデバッグ、テストするためにこの開発設定を使用しますので、これらのツールや使用手順に十分習熟しておくとよいでしょう。
