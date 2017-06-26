# 開発環境の準備

## この章の目標

この章の目標は、作業用のPureScript開発環境を準備し、最初のPureScriptプログラムを書くことです。

これから書く最初のコードは、NPMとBowerから依存するライブラリを使用し、ビルド自動化ツールであるGruntを使用してビルドされるライブラリの例です。このライブラリは直角三角形の対角線の長さを計算する関数ひとつだけを提供します。

## 導入

PureScript開発環境を準備するために、次のツールを使います。

-  [`psc`](http://purescript.org) -  PureScriptコンパイラ本体
-  [`npm`](http://npmjs.org) - 残りの開発ツールをインストールできるようにする、Nodeパッケージマネージャ
-  [`bower`](http://bower.io/) ​​- 必要となる様々なバージョンのPureScriptパッケージで使われているパッケージマネージャ
-  [`grunt`](http://gruntjs.com/) - PureScriptコードをビルドするために使用する自動化ツール

この章ではこれらのツールのインストール方法と設定を説明します。

## PureScriptのインストール

PureScriptコンパイラをインストールするときに推奨される方法は、ソースからコンパイラをビルドすることです。PureScriptコンパイラは[PureScriptのウェブサイト](http://purescript.org)から64ビットのUbuntu用のバイナリディストリビューションとしてダウンロードすることもできますが、現在のところバイナリディストリビューションは主要なリリースについてだけ提供されています。もし最近のバグ修正や機能追加がなされた最新版に保ち、コンパイラで最新のパッケージをビルドできるようにしたいなら、最新のマイナーリリースをビルドするよう以下の指示に従ってください。

主なソフトウェア要件としては、[Haskell Platform](http://haskell.org/platform)がインストールされていることです。お使いのオペレーティングシステムによっては、パッケージマネージャを使用して`ncurses`開発パッケージもインストールする必要があるかもしれません(例えば、Ubuntuでは`libncurses5-dev`パッケージとしての利用できます)。

Cabal実行ファイルの最新版を持っているのを確認することから始めましょう。

```shell
$ cabal install Cabal cabal-install
```

また、Cabalのパッケージ一覧が最新であることも確認してください。

```shell
$ cabal update
```

PureScriptコンパイラは、グローバルもしくはローカルディレクトリ内のCabalサンドボックス内のどちらかにインストールすることができます。この節ではグローバルにPureScriptをインストールし、その実行ファイルがパス上で利用できるようにする方法を説明します。

`cabal install`コマンドを使用して、HackageからPureScriptをインストールします。

```shell
$ cabal install purescript
```

これでコンパイラおよび関連する実行ファイルはあなたのパス上で利用できるようになるでしょう。確認のために、コマンドラインでPureScriptコンパイラを実行してみましょう：

```shell
$ psc
```

## 各ツールのインストール

もし[NodeJS](http://nodejs.org/)がインストールされていないなら、NodeJSをインストールする必要があります。そうするとシステムに `npm`パッケージマネージャもインストールされるはずです。 `npm`がインストールされ、パス上で利用可能であることを確認してください。

`npm` がインストールされたら、GruntとBowerもインストールする必要があります。プロジェクトがどこで作業しているかにかかわらずこれらのコマンドラインツールを利用可能にするため、通常はグローバルにインストールしておくのがいいでしょう。

```shell
$ npm install -g grunt-cli bower
```

これで、最初のPureScriptプロジェクトを作成するために必要なすべてのツールの用意ができたことになります。

## Hello, PureScript!

まずはシンプルに始めましょう。PureScriptコンパイラ `psc`を直接使用して、基本的なHello World! プログラムをコンパイルします。3つの標準のコマンドですべての依存関係ライブラリを含めてゼロからアプリをビルドできるようになるまで、この章を読み進むにつれて開発手順をだんだんと自動化していきます。

まず最初に、ソースファイルのディレクトリ `src`を作成し、`src/Chapter2.purs`という名前のファイルに以下のコードを貼り付けます。

```haskell
module Chapter2 where

import Debug.Trace

main = trace "Hello, World!"
```

これは小さなサンプルコードですが、​​いくつかの重要な概念を示しています。

- すべてのソースファイルはモジュールヘッダから始まります。モジュール名は、ドットで区切られた大文字で始まる1つ以上の単語から構成されています。ここではモジュール名としてひとつの単語だけが使用されていますが、`My.First.Module`というようなモジュール名も有効です。
- モジュールは、モジュール名の各部分を区切るためのドットを含めた、完全な名前を使用してインポートされます。ここでは`trace`関数を提供する `Debug.Trace`モジュールをインポートしています。
-  この`main`プログラムの定義本体は、関数適用の式になっています。PureScriptでは、関数適用は関数名の後に引数を空白で区切って書くことで示されます。

それではこのコードをビルドして実行してみましょう。次のコマンドを実行します。

```shell
$ psc src/Chapter2.purs
```

うまくいくと、大量のJavaScriptがコンソールに出力されるのを目にするはずです。コンソールに出力する代わりに、`--output`コマンドラインオプションで出力をファイルにリダイレクトしてみましょう。

```shell
$ psc src/Chapter2.purs --output dist/Main.js
```

これでNodeJSを使用してコードを実行することができるはずです。

```shell
$ node dist/Main.js
```

うまくいくと、NodeJSはこのコードを正常に実行し、コンソールには何も出力されないはずです。これは、メインとなるモジュールの名前をPureScriptコンパイラに教えていないためです！

```shell
$ psc src/Chapter2.purs --output dist/Main.js --main=Chapter2
```

再びNodeJSで実行すると、今度は "Hello, World!" という単語がコンソールに出力されるのがわかるはずです。

## 使用されていないコードを取り除く

テキストエディタで `dist/Main.js`ファイルを開くと、大量のJavaScriptコードが書かれているのがわかります。これはコンパイラがPreludeと呼ばれるモジュール群で定義されている標準関数を追加しているためです。Preludeにはコンソールに出力するのに使う `Debug.Trace`モジュールが含まれています。

ここで生成されたコードのほとんどは実際には使用されていないので、別のコンパイラオプションを指定すると未使用のコードを削除することができます。

```shell
$ psc src/Chapter2.purs --output dist/Main.js --main=Chapter2 --module Chapter2
```

`Chapter2`モジュールで定義されたコードで必要とされているJavaScriptだけを含めるよう` psc`に指示する`--module Chapter2`オプションを追加しました。生成されたコードをテキストエディタで開くと、次のように出力されているのがわかるはずです。

```javascript
var PS = PS || {};
PS.Debug_Trace = (function () {
    "use strict";
    function trace(s) { 
      return function() {
        console.log(s);
        return {};  
      };
    };
    return {
        trace: trace
    };
})();

var PS = PS || {};
PS.Chapter2 = (function () {
    "use strict";
    var Debug_Trace = PS.Debug_Trace;
    var main = Debug_Trace.trace("Hello, World!");
    return {
        main: main
    };
})();

PS.Chapter2.main();
```

NodeJSを使用してこのコードを実行すると、先ほどと同じ文字列がコンソールに出力されるはずです。

ここでPureScriptコンパイラがJavascriptコードを生成する方法の要点が示されています。

- すべてのモジュールはオブジェクトに変換され、そのオブジェクトにはそのモジュールのエクスポートされたメンバが含まれています。モジュールは即時関数パターンによってスコープが限定されたコードで初期化されています。
-  PureScriptは可能な限り変数の名前をそのまま使おうとします
-  PureScriptにおける関数適用は、そのままJavaScriptの関数適用に変換されます。
- 引数のない単純な呼び出しとしてメインメソッド呼び出しが生成され、すべてのモジュールが定義された後に実行されます。
-  PureScriptコードはどんな実行時ライブラリにも依存しません。コンパイラによって生成されるすべてのコードは、あなたのコードが依存するいずれかのPureScriptモジュールをもとに出力されているものです。

PureScriptはシンプルで理解しやすいコードを生成すること重視しているので、これらの点は大切です。実際に、ほとんどのコード生成処理はごく軽い変換です。PureScriptについての理解が比較的浅くても、ある入力からどのようなJavaScriptコードが生成されるかを予測することは難しくありません。

## Gruntによるビルドの自動化

今度は、PureScriptコンパイラオプションを毎回手で入力する代わりに、コードを自動でビルドできるように、Gruntを設定してみましょう。

プロジェクトディレクトリに`Gruntfile.js`という名前のファイルを作成し、次のコードを貼り付けてください。

```javascript
module.exports = function(grunt) {

  "use strict";

  grunt.initConfig({

    srcFiles: ["src/**/*.purs"],

    psc: {
      options: {
        main: "Chapter2",
        modules: ["Chapter2"]
      },
      all: {
        src: ["<%=srcFiles%>"],
        dest: "dist/Main.js"
      }
    }
  });

  grunt.loadNpmTasks("grunt-purescript");
  
  grunt.registerTask("default", ["psc:all"]);
};
```

このファイルではNodeモジュールを定義しており、ビルド構成を定義するために`grunt`モジュールをライブラリとして使用しています。JSONプロパティとしてコマンドラインオプションを指定してPureScriptコンパイラを呼び出せる`grunt-purescript`プラグインを使用しています。

`grunt-purescript`プラグインは他にも便利な機能を提供しており、コードから自動的にMarkdownドキュメントを生成する機能や、ライブラリから` psci`対話式コンパイラ向けの設定ファイルを自動生成する機能があります。興味があれば `grunt-purescript` [プロジェクトのホームページ](http://github.com/purescript-contrib/grunt-purescript)を参照してみてください。

次のように入力して、ローカルのmodulesディレクトリに `grunt`ライブラリと`grunt-purescript`プラグインをインストールしてください。

```shell
$ npm install grunt grunt-purescript@0.6.0
```

保存された`Gruntfile.js`ファイルを使うと、次のようにコードをコンパイルできるようになります。

```shell
$ grunt
>> Created file dist/Main.js.

Done, without errors.
```

## NPMパッケージの作成

Gruntを設定したので、コンパイルするときに毎回コマンドラインにコマンドを入力する必要はなくなりましたが、もっと重要なのは、アプリケーションのエンドユーザはどちらも必要ないということです。そのためには、ビルドする前にNPMパッケージの必要なモジュールを自動的にインストールしておくという手順を追加しておきましょう。

依存関係が指定された独自のNPMパッケージを定義します。

プロジェクトディレクトリで `init`サブコマンドを指定して` npm`を実行し、新しいプロジェクトを初期化します。

```shell
$ npm init
```

いろいろと質問されますが、それが終わると`package.json`という名前のファイルがプロジェクトディレクトリに追加されます。このファイルではプロジェクトのプロパティを指定したり、依存するライブラリの指定を追加することができます。テキストエディタでこのファイルを開き、JSONオブジェクトに次のプロパティを追加しましょう。

```json
"dependencies": {
  "grunt-purescript": "0.6.0"
}
```

このコードではインストールする`grunt-purescript`プラグインの厳密なバージョンを指定しています。

依存するライブラリを手作業でインストールするかわりに、エンドユーザーは単に `npm`コマンドを使用するだけで必要なものすべてをインストールできるようになりました。

```shell
$ npm install
```

## Bowerによる依存関係の追跡

この章の目的となっている`diagonal`関数を書くためには、平方根を計算できるようにする必要があります。`purescript-math`パッケージにはJavaScriptの`Math`オブジェクトのプロパティとして定義されている関数の型定義が含まれていますので、`purescript-math`パッケージをインストールしてみましょう。 `npm`の依存関係でやったのと同じように、次のようにコマンドラインに入力すると直接このパッケージをダウンロードできます。

```shell
$ bower install purescript-math#0.1.0
```

このコマンドは `purescript-math`ライブラリのバージョン0.1.0をそれが依存するライブラリと一緒にインストールします。

しかし、`package.json`を作成してNPMの依存関係を制御するために` npm init`を使用したのと同じような方法で、Bowerの依存関係が含まれている`bower.json`ファイルを設定することができます。

コマンドラインに次のコマンドを入力します。

```shell
$ bower init
```

NPMの場合とちょうど同じように、いくつか質問をされ、それが終わると `bower.json`ファイルがプロジェクトディレクトリに配置されます。この処理の途中で、すでに存在するライブラリの依存関係をプロジェクトファイルに含めたいかどうかを尋ねられるでしょう。「はい」を選択した場合は、`bower.json` にこのようなセクションがあるのがわかるでしょう。

```javascript
"dependencies": {
  "purescript-math": "0.1.0"
}
```

エンドユーザーが手作業で依存するライブラリを指示する必要がなくなり、代わりに次のようにコマンドを呼び出すだけで依存するライブラリを取り込むことができるようになりました。

```shell
$ bower update
```

それでは、Bowerから取り込んだ依存先ライブラリをコンパイルに含めるように、Gruntスクリプトを更新してみましょう。`Gruntfile.js`を編集し、ソースファイルについての行を次のように変更します。

```javascript
srcFiles: ["src/**/*.purs", "bower_components/**/src/**/*.purs"]
```

この行では `bower_components`ディレクトリのソースファイルをコンパイルするソースファイルに含めています。独自のBower構成がある場合は、それに応じてこの行を修正する必要があるかもしれません。

> ### なぜNPMとBowerの両方を使うのか？  {-}
>
>疑問に思ったかもしれませんが、なぜ2つ​​のパッケージマネージャを使い分ける必要があるのでしょうか？PureScriptライブラリをNPMレジストリに含めることはできないのでしょうか？
>
> PureScriptコミュニティは、さまざまな理由でPureScriptの依存ライブラリをBowerを使用して標準化しています。
>
>  -  PureScriptのライブラリパッケージがJavaScriptのソースコードを含むことはめったになく、コンパイルされないままでNPMレジストリへ配置するのには適していません。
>  - Bowerレジストリは、直接コードをホスティングする代わりに、既存のGitリポジトリのパッケージ名とバージョンの対応関係だけを管理しています。これによりコミュニティがコードおよびリリースを管理するのにGitHubのような既存のツールを使用することができます。
>  - BowerはCommonJSのモジュール標準のような特定の配置に従うようパッケージに要求してしません。
>
> もちろん、任意のパッケージマネージャを自由に選択して使用することもできます。PureScriptコンパイラおよびツール群は、Bowerに（またはNPM、Gruntなどにも）依存しているわけではありません。 

## 対角線の長さの計算

それでは外部ライブラリの関数を使用する例として `diagonal`関数を書いてみましょう。

まず、 `src/Chapter2.purs`ファイルの先頭に次の行を追加し、` Math`モジュールをインポートします。

```haskell
import Math
```

そして、次のように`diagonal`関数を定義します。

```haskell
diagonal w h = sqrt (w * w + h * h)
```

この関数の型を定義する必要はないことに注意してください。`diagonal` は2つの数値を取り数を返す関数である とコンパイラは推論することができます。しかし、ドキュメントとしても役立つので、通常は型注釈を提供しておくことをお勧めします。

それでは、新しい`diagonal`関数を使うように` main`関数も変更してみましょう。

```haskell
main = print (diagonal 3 4)
```

Gruntを使用して、モジュールを再コンパイルします。

```shell
$ grunt
```

生成されたコードを再び実行すると、このコードが正常に呼び出されたことがわかるでしょう。

```shell
$ node dist/Main.js 

5
```

## 対話式処理系を使用したコードのテスト

PureScriptコンパイラには `psci`と呼ばれる対話式のREPL(Read-eval-print loop)が付属しています。`psci`はコードをテストしたり思いついたことを試すのにとても便利です。それでは、` psci`を使って`diagonal`関数をテストしてみましょう。

`grunt-purescript`プラグインは、ソースファイルに応じて` psci`設定を自動で生成するように設定することができます。これにより`psci`に手作業でモジュールを読み込む手間を省くことができます。

これを設定するには、`Gruntfile.js`ファイルに以下のような`psc`や` pscMake`という新しいビルドターゲットを追加します。

```javascript
dotPsci: ["<%=srcFiles%>"]
```

また、デフォルトのタスクにこのターゲットを追加しておきましょう。

```javascript
grunt.registerTask("default", ["psc:all", "dotPsci"]);
```

これで `grunt`を実行すると` .psci`ファイルがプロジェクトディレクトリに自動生成されるようになりました。このファイルは、 `psci`の起動時に設定で使用されるコマンドを指定するのに使われます。

それでは `psci`を起動してみます。

```shell
$ psci
> 
```

コマンドの一覧を見るには、`:?`と入力します。

```shell
> :?
The following commands are available:

    :?              Show this help menu
    :i <module>     Import <module> for use in PSCI
    :m <file>       Load <file> for importing
    :q              Quit PSCi
    :r              Reset
    :t <expr>       Show the type of <expr>
```

Tabキーを押すと、自分のコードで利用可能なすべての関数、及びBowerの依存関係とプレリュードモジュールのリストをすべて見ることができるはずです。

幾つか数式を評価してみてください。`psci`で評価を行うには、1行以上の式を入力し、Ctrl+ Dで入力を終了します。

```shell
> 1 + 2
3

> "Hello, " ++ "World!"
"Hello, World!"
```

それでは`psci`で`diagonal`関数を試してみましょう。

```shell
> Chapter2.diagonal 5 12

13
```

また、`psci`で関数を定義する使こともできます。

```shell
> let double x = x * 2

> double 10
20
```

コード例の構文がまだよくわからなくても心配はいりません。 この本を読み進めるうちにわかるようになっていきます。

最後に、`:t`コマンドを使うと式の型を確認することができます。

```shell
> :t true
Prim.Boolean

> :t [1, 2, 3]
[Prim.Number]
```

`psci`で試してみてください。もしどこかでつまづいた場合は、メモリ内にあるコンパイル済みのすべてのモジュールをアンロードするリセットコマンド`:r`を使用してみてください。

## 任意: CommonJSのモジュールのビルド

PureScriptコンパイラの`psc`コマンドは、ウェブブラウザでの使用に適した、単一の出力ファイルにJavaScriptコードを生成します。それとは別に、コンパイルには`psc-make`という選択肢もあります。`psc-make`では、コンパイルされるPureScriptモジュールそれぞれについて、個別のCommonJSモジュール生成することができます。もしCommonJSモジュール標準に対応したNodeJSのような実行環境を対象とするなら、`psc-make`のほうが望ましい場合があるでしょう。

コマンドラインで`psc-make`を実行するには、入力ファイルを指定し、`--output`オプションでCommonJSモジュールが作成されるディレクトリも指定します。

```shell
$ psc-make src/Chapter2.purs --output dist/
```

与えられた入力ファイルのそれぞれのモジュールについて、`dist/`ディレクトリの中にサブディレクトリが作成されるでしょう。Bowerの依存関係を使用している場合は、`bower_components/`ディレクトリ内のソースファイルを含めることを忘れないでください！

`grunt-purescript`プラグインは` psc-make`を使用したコンパイルにも対応しています。Gruntから `psc-make`を使用するには、`Gruntfile.js`ファイルを次のように変更します。

-  ビルドターゲットを`psc`から`pscMake` へ変更します
- 出力先を`dist/Main.js`という単一のファイルからディレクトリ` dest： "dist /" `へ変更します
-  デフォルトのタスクを`pscMake`ビルドターゲットを参照するように変更します

これで、 `Chapter2`モジュールとその依存先ライブラリそれぞれについて、`grunt`コマンドラインツールが `dist/`の下にサブディレクトリを作成するようになりました。

## Gruntプロジェクトテンプレートの使用

様々なビルドプロセスに対応するために、NPMやGrunt、Bowerはいろいろな方法でカスタマイズすることができます。しかし、簡単なプロジェクトでは、この手順はGruntプロジェクトテンプレートを使用して自動化することもできます。

`grunt-init`ツールは、テンプレートを利用して簡単なプロジェクトを開始する方法を提供します。`grunt-init-purescript`プロジェクトは、簡単なテストスイートを含むPureScriptプロジェクトのシンプルなテンプレートを提供します。

`grunt-init`を使用してプロジェクトを設定するには、最初にNPMを使用して`grunt-init`のコマンドラインツールをインストールします。

```shell
$ npm install -g grunt-init
```

そして、ホームディレクトリにPureScriptテンプレートを複製してください。たとえば、LinuxやMacでは、次のようにします。

```shell
$ mkdir ~/.grunt-init
$ git clone https://github.com/purescript-contrib/grunt-init-purescript.git \
    ~/.grunt-init/purescript
```

これで、新しいディレクトリに簡単なプロジェクトを作成できるようになりました。

```shell
$ mkdir new-project
$ cd new-project/
$ grunt-init purescript
```

いくつかの簡単な質問を受けたあと、現在のディレクトリにプロジェクトが初期化されますので、これまで見てきたコマンドを使ってビルドの準備をしましょう。

```shell
$ npm install
$ bower update
$ grunt
```

最後のコマンドでは、ソースファイルをビルドし、テストスイートを実行しています。

より複雑なプロジェクトの雛形として、このプロジェクトテンプレートを使用することができます。

> ## 演習 {-}
> 
> 1. (簡単） `Math.pi`定数を使用し、指定された半径の円の面積を計算する関数 `circleArea`を書いてみましょう。また、`psci`を使用してその関数をテストしてください。
> 
> 1. （やや難しい）  `node dist/Main.js`と入力する代わりにユーザが単に `grunt run`を入力するだけで、コンパイルされたコードをNodeJSで実行できるように、` Gruntfile.js`ファイルにタスクを追加しましょう。**ヒント**： `grunt-execute` Gruntプラグインを使用することを検討してください。

## まとめ

この章では、JavaScriptのエコシステムのNPMとBower、Gruntという標準的なツールを使用し、一から開発環境をセットアップしました。

また最初のPureScript関数を書き、コンパイルし、NodeJSを使用して実行することができました。

以降の章では、コードをコンパイルやデバッグ、テストするためにこの開発設定を使用しますので、これらのツールや使用手順に十分習熟しておくとよいでしょう。



