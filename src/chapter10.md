# 外部関数インタフェース

## この章の目標

この章では、PureScriptコードからJavaScriptコードへの呼び出し、およびその逆を可能にする、PureScriptの**外部関数インタフェース**(foreign function interface, FFI)を紹介します。これから扱うのは次のようなものです。

- PureScriptから純粋なJavaScript関数を呼び出す方法
- 既存のJavaScriptコードに基づいて、作用型と`Eff`モナドと一緒に使用する新しいアクションを作成する方法
- JavaScriptからPureScriptコードを呼び出す方法
- 実行時のPureScriptの値の表現を知る方法
- `purescript-foreign`パッケージを使用して型付けされていないデータを操作する方法

この章の終わりにかけて、再び住所録のコード例について検討します。この章の目的は、FFIを使ってアプリケーションに次のような新しい機能を追加することです。

- ポップアップ通知でユーザーに警告する
- フォームのデータを直列化してブラウザのローカルストレージに保存し、アプリケーションが再起動したときにそれを再読み込みする

## プロジェクトの準備

このモジュールのソースコードは、第7章及び第8章の続きになります。今回もそれぞれのディレクトリから適切なソースファイルがGruntfileに含められています。

この章では**型付けされていないデータ**を操作するためのデータ型と関数を提供する`purescript-foreign`ライブラリというBower依存関係がひとつ新しく追加されます。

新しいNPM依存関係もあります。この章のGruntfileは、`grunt-contrib-connect`パッケージを使用してコンパイル後に静的ファイルサーバを実行するようになっています。これは、ウェブページがローカルファイルから配信されているときに起こる、ローカルストレージとブラウザ固有の問題を避けるためです。この章の例を実行するには、まず`grunt`を実行して、それからブラウザで [`http://localhost:8000/`](http://localhost:8000/) を開いてください。

## 免責事項

JavaScriptとの共同作業をできる限り簡単にするため、PureScriptは単純な多言語関数インタフェースを提供します。しかしながら、FFIはPureScriptの**高度な**機能であることには留意していただきたいと思います。FFIを安全かつ効率的に使用するには、扱うつもりであるデータの実行時の表現についてよく理解していなければなりません。この章では、PureScriptの標準ライブラリのコードに関連する、そのような理解を与えることを目指しています。

PureScriptのFFIはとても柔軟に設計されています。実際には、外部関数に最低限の型だけを与えるか、それとも型システムを利用して外部のコードの誤った使い方を防ぐようにするか、開発者が選ぶことができるということを意味しています。標準ライブラリのコードは、後者の手法を好む傾向にあります。簡単な例としては、JavaScriptの関数で戻り値が `null`をされないことを保証することはできません。実のところ、既存のJavaScriptコードはかなり頻繁に`null`を返します！しかし、PureScriptの型は通常null値を持っていません。そのため、FFIを使ってJavaScriptコードのインターフェイスを設計するときは、これらの特殊な場合を適切に処理するのは開発者の責任です。

## JavaScriptからPureScriptを呼び出す

少なくとも単純な型を持った関数については、JavaScriptからPureScript関数を呼び出すのはとても簡単です。

例として以下のような簡単なモジュールを見てみましょう。

```haskell
module Test where

gcd :: Number -> Number -> Number
gcd 0 m = m
gcd n 0 = n
gcd n m | n > m = gcd (n - m) m
gcd n m = gcd (m - n) n
```

この関数は、減算を繰り返すことによって2つの数の最大公約数を見つけます。関数を定義するのにPureScriptを使いたくなるかもしれない良い例となっていますが、JavaScriptからそれを呼び出すためには条件があります。
PureScriptでパターン照合と再帰を使用してこの関数を定義するのは簡単で、実装する開発者は型検証器の恩恵を受けることができます。

このモジュールを`psc`で次のようにコンパイルし、結果のJavaScriptをを`Node`にロードしてみましょう。

```text
$ psc Test.purs > Test.js

$ node Test.js
```

この関数をJavaScriptから呼び出す方法を理解するには、PureScriptの関数は常に引数がひとつのJavaScript関数へと変換され、引数へは次のようにひとつづつ適用していかなければならないことを理解するのが重要です。

```javascript
> var test = PS.Test.gcd(15)(20);
```

`Test`モジュールはグローバルな`PS`オブジェクトのメンバ`Test`へとコンパイルされることに注意してください。これは`psc`コンパイラのデフォルトの動作ですが、グローバル名前空間は次のようにコマンドラインオプションを使用して変更することができます。

```text
$ psc Test.purs --browser-namespace=MyNamespace > Test.js
```

`psc-make`を使用してCommonJSのモジュールにコードをコンパイルすると、コンパイルされたモジュールは、デフォルトでは` output`フォルダに配置されます。生成されたこれらのモジュールを`node_modules`ディレクトリにコピーすると、NodeJS(もしくはその他のCommonJS互換環境)の`require`関数を使用して、モジュールを参照することができるようになります。

```javascript
var Test = require('Test');
```

このモジュールで定義された関数は、先ほどと同様に使うことができます。

```javascript
Test.gcd(15)(20);
```

## 名前の生成を理解する

PureScriptはコード生成時にできるだけ名前を保存することを目的としています。具体的には、トップレベルでの宣言では、JavaScriptのキーワードでなければ任意の識別子が保存されます。

識別子としてJavaScriptの予約語を使う場合は、名前はダブルダラー記号でエスケープされます。たとえば、次のPureScriptコードを考えてみます。

```haskell
null = []
```

これは以下のようなJavaScriptへコンパイルされます。

```javascript
var $$null = [];
```

また、識別子に特殊文字を使用したい場合は、単一のドル記号を使用してエスケープされます。たとえば、このPureScriptコードを考えます。

```haskell
example' = 100
```

これは以下のJavaScriptにコンパイルされます。

```javascript
var example$prime = 100;
```

この方式は、ユーザー定義の中置演算子の名前を生成するためにも使用されます。

```haskell
(%) a b = ...
```

これは次のようにコンパイルされます。

```javascript
var $percent = ...
```

コンパイルされたPureScriptコードがJavaScriptから呼び出されることを意図している場合、識別子は英数字のみを使用し、JavaScriptの予約語を避けることをお勧めします。ユーザ定義演算子がPureScriptコードでの使用のために提供される場合でも、JavaScriptから使うための英数字の名前を持った代替関数を提供しておくことをお勧めします。

## 実行時のデータ表現

型はプログラムはある意味で「正しい」ことをコンパイル時に判断できるようにします。つまり、実行時には中断されません。しかし、これは何を意味するのでしょうか？PureScriptでは式の型は実行時の表現と互換性がなければならないことを意味します。

そのため、PureScriptとJavaScriptコードを一緒に効率的に使用できるように、実行時のデータ表現について理解することが重要です。これは、与えられた任意のPureScriptの式について、その値が実行時にどのように評価されるかという挙動を理解できるべきであることを意味しています。

PureScriptの式は、実行時に特に単純な表現を持っているということは朗報です。実際に標準ライブラリのコードについて、その型を考慮すれば式の実行時のデータ表現を把握することが可能です。

単純な型については、対応関係はほとんど自明です。たとえば、式が型`Boolean`を持っていれば、実行時のその値`v`は`typeof v === 'boolean'`を満たします。つまり、型`Boolean`の式は`true`もしくは`false`のどちらか一方の(JavaScriptの)値へと評価されます。実のところ、`null`や`undefined`に評価される、型`Boolean`のPureScriptの式はありません。

`Number`と`String`の型の式についても同様のことが成り立ちます。`Number`型の式は`null`でないJavaScriptの数へと評価されますし、`String`型の式は`null`でないJavaScriptの文字列へと評価されます。

もっと複雑な型についてはどうでしょうか？

すでに見てきたように、PureScriptの関数は引数がひとつのJavaScriptの関数に対応しています。厳密に言えば、任意の型`a`、`b`について、式`f`の型が`a -> b`で、式`x`が型`a`についての適切な実行時表現の値へと評価されるなら、`f`はJavaScriptの関数へと評価され、`x`を評価した結果に`f`を適用すると、それは型`b`の適切な実行時表現を持ちます。簡単な例としては、`String -> String`型の式は、`null`でないJavaScript文字列から`null`でないJavaScript文字列への関数へと評価されます。

ご想像のとおり、PureScriptの配列はJavaScriptの配列に対応しています。しかし、PureScriptの配列は均質であり、つまりすべての要素が同じ型を持っていることは覚えておいてください。具体的には、もしPureScriptの式`e`が任意の型`a`について型`[a]`を持っているなら、`e`はすべての要素が型`a`の適切な実行時表現を持った(`null`でない)JavaScript配列へと評価されます。

PureScriptのレコードがJavaScriptのオブジェクトへと評価されることはすでに見てきました。ちょうど関数と配列の場合のように、そのラベルに関連付けられている型を考慮すれば、レコードのフィールドのデータの実行時の表現についても推論することができます。もちろん、レコードのそれぞれのフィールドは、同じ型である必要はありません。

## 代数的データ型の実行時表現

PureScriptコンパイラは、代数的データ型のすべての構築子についてそれぞれ関数を定義し、新たなJavaScriptオブジェクト型を作成します。これらの構築子はこれらのプロトタイプに基づいて新しいJavaScriptオブジェクトを作成する関数に対応しています。

たとえば、次のような単純な代数的データ型を考えてみましょう。

```haskell
data ZeroOrOne a = Zero | One a
```

PureScriptコンパイラは、次のようなコードを生成します。

```javascript
function One(value0) {
    this.value0 = value0;
};

One.create = function (value0) {
    return new One(value0);
};

function Zero() {
};

Zero.value = new Zero();
```

ここで2つのJavaScriptオブジェクト型`Zero`と`One`を見てください。JavaScriptの予約語`new`を使用すると、それぞれの型の値を作成することができます。引数を持つ構築子については、コンパイラは`value0`、` value1`などと呼ばれるフィールドに対応するデータを格納します。

PureScriptコンパイラは補助関数も生成します。引数のない構築子については、コンパイラは構築子が使われるたびに`new`演算子を使うのではなく、データを再利用できるように`value`プロパティを生成します。ひとつ以上の引数を持つ構築子では、適切な表現を持つ引数を取り適切な構築子を適用する`create`関数をコンパイラは生成します。

２引数以上の構築子についてはどうでしょうか？その場合でも、PureScriptコンパイラは新しいオブジェクト型と補助関数を作成します。しかし今回は、補助関数は2引数のカリー化された関数です。たとえば、次のような代数的データ型を考えます。

```haskell
data Two a b = Two a b
```

このコードからは、次のようなJavaScriptコードを生成されます。

```javascript
function Two(value0, value1) {
    this.value0 = value0;
    this.value1 = value1;
};

Two.create = function (value0) {
    return function (value1) {
        return new Two(value0, value1);
    };
};
```

ここで、オブジェクト型`Two`の値は予約語`new`または`Two.create`関数を使用すると作成することができます。

newtypeの場合はまた少し異なります。newtypeは単一の引数を取る単一の構築子を持つよう制限された代数的データ型であることを思い出してください。この場合には、実際はnewtypeの実行時表現は、その引数の型と同じになります。

例えば、電話番号を表す次のようなnewtypeを考えます。

```haskell
newtype PhoneNumber = PhoneNumber String
```

これは実行時にはJavaScriptの文字列として表されます。newtypeは型安全性の追加の層を提供しますが、実行時の関数呼び出しのオーバーヘッドがないので、ライブラリを設計するのに役に立ちます。

## 量化された型の実行時表現

量化された型(多相型)の式は、制限された表現を実行時に持っています。実際には、量化された型の式が比較的少数与えられたとき、とても効率的に解決できることを意味しています。

例えば、次の多相型を考えてみます。

```haskell
forall a. a -> a
```

この型を持っている関数にはどんなものがあるでしょうか。少なくともひとつはこの型を持つ関数が存在しています。すなわち、`Prelude`で定義されている恒等関数`id`です。

```haskell
id :: forall a. a -> a
id a = a
```

実のところ、`id`の関数はこの型の**唯一の**(全)関数です！これは間違いなさそうに見えます(この型を持った`id`とは明らかに異なる式を書こうとしてみてください)が、しかし、これを確かめるにはどうしたらいいでしょうか。これは型の実行時表現を考えることによって確認することができます。

量化された型`forall a. t`の実行時表現はどうなっているのでしょうか。さて、この型の実行時表現を持つ任意の式は、型`a`をどのように選んでも型`t`の適切な実行時表現を持っていなければなりません。上の例では、型`forall a. a -> a`の関数は、`String -> String`、 `Number -> Number`、, `[Boolean] -> [Boolean]`などといった型について、適切な実行時表現を持っていなければなりません。 これらは、数から数、文字列から文字列の関数でなくてはなりません。

しかし、それだけでは十分ではありません。量化された型の実行時表現は、これよりも更に厳しくなります。任意の式がパラメトリック多相的でなければなりません。つまり、その実装において、引数の型についてのどんな情報も使うことができないのです。この追加の条件は、考えられる多相型のうち、次のようなJavaScriptの関数として問題のある実装を禁止します。

```javascript
function invalid(a) {
    if (typeof a === 'string') {
        return "Argument was a string.";
    } else {
        return a;
    }
}
```

確かにこの関数は文字列から文字列、数から数へというような関数ではありますが、追加の条件を満たしていません。引数の実行時の型を調べているからです。したがって、この関数は型`forall a. a -> a`の正しい実装だとはいえないのです。

関数の引数の実行時の型を検査することができなければ、唯一の選択肢は引数をそのまま返すことだけであり、したがって `id`は、`forall a. a -> a`のまったく唯一の実装なのです。

**パラメトリック多相**(parametric polymorphism)と**パラメトリック性**(parametricity)についての詳しい議論は本書の範囲を超えています。しかしながら、PureScriptの型は、実行時に**消去**されているので、PureScriptの多相関数は(FFIを使わない限り)引数の実行時表現を検査することが**できない**し、この多相的なデータの表現は適切であることに注意してください。

## 制約された型の実行時表現

型クラス制約を持つ関数は、実行時に面白い表現を持っています。関数の振る舞いはコンパイラによって選ばれた型クラスのインスタンスに依存する可能性があるため、関数には選択したインスタンスから提供された型クラスの関数の実装が含まれてた**型クラス辞書**(type class dictionary)と呼ばれる追加の引数が与えられています。

例えば、`Show`型クラスを使用している制約された型を持つ、次のような単純なPureScript関数について考えます。

```haskell
shout :: forall a. (Show a) => a -> String
shout a = show a ++ "!!!" 
```

このコードから生成されるJavaScriptは次のようになります。

```javascript
var shout = function (dict) {
    return function (a) {
        return show(dict)(a) + "!!!";
    };
};
```

`shout`は１引数ではなく、２引数の(カリー化された)関数にコンパイルされていることに注意してください。最初の引数`dict`は`Show`制約の型クラス辞書です。`dict`には型`a`の`show`関数の実装が含まれています。

最初の引数として明示的にPreludeの型クラス辞書を渡すと、JavaScriptからこの関数を呼び出すことができます。

```javascript
shout(Prelude.showNumber())(42);
```

> ## 演習 {-}
> 
> 1. (簡単) これらの型の実行時の表現は何でしょうか。
> 
>     ```haskell
>     forall a. a
>     forall a. a -> a -> a
>     forall a. (Ord a) => [a] -> Boolean
>     ```
> 
>     これらの型を持つ式についてわかることはなんでしょうか。
>     
> 1. (やや難しい) `psc-make`を使ってコンパイルし、NodeJSの`require`関数を使ってモジュールをインポートすることで、JavaScriptから`purescript-arrays`ライブラリの関数を使ってみてください。

## PureScriptからのJavaScriptコードを使う

PureScriptからJavaScriptコードを使用する最も簡単な方法は、**foreign import**宣言を使用し、既存のJavaScriptの値に型を与えることです。

たとえば、特殊文字をエスケープすることによりURIのコンポーネントを符号化するJavaScriptの`encodeURIComponent`関数について考えてみます。

```text
$ node

node> encodeURIComponent('Hello World')
'Hello%20World'
```

`null`でない文字列から`null`でない文字列への関数であり、副作用を持っていないので、この関数はその型`String -> String`について適切な実行時表現を持っています。

次のような外部インポート宣言を使うと、この関数に型を割り当てることができます。

```haskell
foreign import encodeURIComponent :: String -> String
```

また、PureScriptで記述された関数のように、この関数をPureScriptから使ってみます。たとえば、この宣言をモジュールとして保存して`psci`にロードすると、先ほどの計算を再現することができます。

```haskell
> encodeURIComponent "Hello World"
"Hello%20World"
```

このアプローチは、簡単なJav​​aScriptの値には適していますが、もっと複雑な値に使うには限界があります。ほとんどの既存のJavaScriptコードは、基本的なPureScriptの型の実行時表現によって課せられた厳しい条件を満たしていないからです。このような場合のためには、適切な実行時表現に従うことを強制するようにJavaScriptコードを**ラップする**という別の方法があります。

## JavaScriptの値のラッピング

外部インポート宣言は、型注釈の直前に文字列リテラルを含めることで、JavaScriptコードのブロックと対にすることができます。そのJavaScriptコードは、コンパイル時に生成されたコードに直接挿入されます。

これはPureScriptの型を与えるためにJavaScriptコードの既存の部分をラップする場合に特に便利です。このようにしたくなる理由はいくつかあります。

- 任意のJavaScriptの副作用を追跡するために、`Eff`モナドを使うことができます。。
- 関数の適切な実行時表現を与えるために、`null`や`undefined`のような特殊な場合を処理するために必要な場合があります。

外部インポート宣言を使用して、配列についての`head`関数を作成したいとしましょう。JavaScriptでは次のような関数になるでしょう。

```javascript
function head(arr) {
    return arr[0];
}
```

しかし、この関数には問題があります。型`forall a. [a] -> a`を与えようとしても、空の配列に対してこの関数は`undefined`を返します。したがって、この特殊な場合を処理するために、ラッパー関数を使用する必要があります。

簡単な方法としては、空の配列の場合に例外を投げる方法があります。

```haskell
foreign import head
  "function head(arr) {\
  \  if (arr.length) {\
  \    return arr[0];\
  \  } else {\
  \    throw new Error('Empty array!');\
  \  }\
  \}" :: forall a. [a] -> a
```

バックスラッシュを使用するとその行から次の1行まで継続することができ、JavaScriptの実装を複数行に分離できることに注意してください。

## 外部型の定義

失敗した場合に例外を投げるという方法は、あまり理想的とはいえません。PureScriptのコードでは、欠けた値のような副作用は型システムを使って扱うのが普通です。この手法としては`Maybe`型構築子を使う方法もありますが、この節ではFFIを使用した別の解決策を扱います。

実行時には型`a`のように表現されますが`undefined`の値も許容するような新しい型`Undefined a`を定義したいとしましょう。

**外部インポート宣言**とFFIを使うと、**外部型**(foreign type)を定義することができます。構文は外部関数を定義するのと似ています。

```haskell
foreign import data Undefined :: * -> *
```

この予約語`data`は値ではなく定義している型を表していることに注意してください。型シグネチャの代わりに、新しい型の**種**を与えます。このとき、種`Undefined`が`* -> *`であると宣言しています。つまり`Undefined`は型構築子です。

これで`head`の定義を簡素化することができます。

```haskell
foreign import head
  "function head(arr) {\
  \  return arr[0];\
  \}" :: forall a. [a] -> Undefined a
```

2点変更がある注意してください。`head`関数の本体ははるかに簡単で、もしその値が未定義であったとしても`arr[0]`を返し、型シグネチャはこの関数が未定義の値を返すことがあるという事実を反映するよう変更されています。

この関数はその型の適切な実行時表現を持っていますが、型`Undefined a`の値を使用する方法がありませんので、まったく役に立ちません。しかし、FFIを使用して新しい関数を幾つか書くことによって、それを修正することができます！

次の関数は、値が定義されているかどうかを教えてくれる最も基本的な関数です。

```haskell
foreign import isUndefined
  "function isUndefined(value) {\
  \  return value === undefined;\
  \}" :: forall a. Undefined a -> Boolean
```

PureScriptから`isUndefined`と`head`を一緒に使用すると、便利な関数を定義することができます。

```haskell
isEmpty :: forall a. [a] -> Boolean
isEmpty = isUndefined <<< head
```

ここで、定義されたこの外部関数はとても簡単であり、PureScriptの型検査器を使うことによる利益をなるべく多く得るということを意味します。一般に外部関数は可能な限り小さく保ち、アプリケーションの処理はPureScriptコードへ移動しておくことをおすすめします。

## 多変数​関数

PureScriptのPreludeには、興味深い外部型がいくつかも含まれています。すでに扱ってきたように、PureScriptの関数型は単一の引数だけを取りますが、**カリー化**を使うと複数の引数の関数をシミュレートすることができます。これには明らかな利点があります。関数を部分適用することができ、関数型の型クラスインスタンスを与えることができます。ただし、効率上のペナルティが生じます。パフォーマンス重視するコードでは、複数の引数を受け入れる本物のJavaScript関数を定義することが必要な場合があります。Preludeではそのような関数を安全に扱うことができるようにする外部型が定義されています。

たとえば、Preludeの`Data.Function`モジュールには次の外部型宣言があります。

```haskell
foreign import data Fn2 :: * -> * -> * -> *
```

これは3つの型引数を取る型構築子`Fn2`を定義します。`Fn2 a b c`は、型`a`と`b`の２つの引数、返り値の型`c`をもつJavaScript関数の型を表現しています。

Preludeでは0引数から10引数までの関数について同様の型構築子が定義されています。

次のように`mkFn2`関数を使うと、2引数の関数を作成することができます。

```haskell
import Data.Function

divides :: Fn2 Number Number Boolean
divides = mkFn2 $ \n m -> m % n == 0
```

そして、 `runFn2`関数を使うと、2引数の関数を適用することができます。

```haskell
> runFn2 divides 2 10
true

> runFn2 divides 3 10
false
```

ここで重要なのは、引数がすべて適用されるなら、コンパイラは`mkFn2`関数や`runFn2`関数を**インライン化**するということです。そのため、生成されるコードはとてもコンパクトになります。

```javascript
var divides = function (n, m) {
    return m % n === 0;
};
```

## 均質なレコード

外部型のさらなる例として、**均質なレコード**(homogeneous records)の型を定義してみましょう。これは、どんなラベルでも持つことができますが、どのプロパティも同じ型をもっているレコードです。 

PureScriptではレコードの各プロパティは異なる型を持つことができます。これは多くの場合に便利ですが、JavaScriptコードにおけるいくつかの典型的なパターンに意味のある型を与えるのがうまくいかないときがあります。

均質なレコードの型はそのプロパティの(統一された)型によってパラメータ化されることになるので、これは次のような`* -> *`という種を持つことになります。

```haskell
foreign import data HRec :: * -> *
``` 

外部値(foreign value)を使用すると、簡単に空の均質なレコードを定義することができます。

```haskell
foreign import empty 
  "var empty = {}" :: forall a. HRec a
```

`forall a. HRec a` という型は、この空の均質なレコードは任意の型`a`について型`a`のプロパティを持っているのを表していることに注意してください。`empty`はどのプロパティも持っていないので、これが正しいのはまったくの自明です！

また、均質なレコードに新しいフィールドを挿入する関数を定義することができます。PureScriptの値は不変なので、JavaScriptコードで既存のレコードをコピーする必要があります。

```haskell
foreign import insert
  "function insert(key, value, rec) {\
  \  var copy = {};\
  \  for (var k in rec) {\
  \    if (rec.hasOwnProperty(k)) {\
  \      copy[k] = rec[k];\
  \    }\
  \  }\
  \  copy[key] = value;\
  \  return copy;\
  \}" :: forall a. Fn3 String a (HRec a) (HRec a)
```

`insert`関数は3引数の関数を表現するために型コンストラクタ`Fn3`を使っています。JavaScriptで手作業でカリー化関数を書くことはとても面倒なので、`Fn3`を使うと便利です。この関数はレコードを複製し、複製へ新しいキーを追加します。

均質なレコードを使うと、通常のPureScriptレコードではできないような、いろいろな面白い操作を行うことができます。例えば、均質なレコードの値に対して関数をマッピングすることができます。

```haskell
foreign import mapHRec
  "function mapHRec(f, rec) {\
  \  var mapped = {};\
  \  for (var k in rec) {\
  \    if (rec.hasOwnProperty(k)) {\
  \      mapped[k] = f(rec[k]);\
  \    }\
  \  }\
  \  return mapped;\
  \}" :: forall a b. Fn2 (a -> b) (HRec a) (HRec b)
```

つまり、`HRec`は`Functor`なのです！

```haskell
instance functorHRec :: Functor HRec where
  (<$>) f rec = runFn2 mapHRec f rec
```

また、`HRec`を`Foldable`型クラスのインスタンスにすることもでき、レコードの値に対して畳み込みをすることもできます。さらに興味深いことに、レコードのプロパティの値だけでなく**ラベル**も受け取る累積関数について畳み込みを実行することができます！

```haskell
foreign import foldHRec
  "function foldHRec(f, r, rec) {\
  \  var acc = r;\
  \  for (var k in rec) {\
  \    if (rec.hasOwnProperty(k)) {\
  \      acc = f(acc, k, rec[k]);\
  \    }\
  \  }\
  \  return acc;\
  \}" :: forall a r. Fn3 (Fn3 r String a r) r (HRec a) r
```

この章のソースコードには、次の演習に対する解決策の基礎として使用することができる `HRec`モジュールの関数が含まれています。

> ## 演習 {-}
> 
> 1. (簡単) `psci` でいくつかの簡単なレコードを構築し、 `runFn3`関数を使用して`insert`関数を試してみてください。
> 
> 1. (やや難しい) 2つの均質なレコードの和集合を計算する関数 `union`を書いてください。2つのレコードがラベルを共有している場合、２つめのレコードが優先させなければいけません。
> 
> 1. (やや難しい) 通常の(カリー化された)関数を使用する`foldHRec`ためのラッパー関数を書いてください。その関数は次のような型を持っていなければなりません。
> 
>     ```haskell
>     forall a r. (r -> String -> a -> r) -> r -> HRec a -> r
>     ```
> 
>     この関数を定義するのにFFIは使用しないでください。
>     
> 1. (難しい) 均質なレコードのキーを検索する関数`lookup`を書いてください。その関数は次のような型を持っていなければなりません。
> 
>     ```haskell
>     forall a. String -> HRec a -> Maybe a
>     ```
> 
>     この関数の次の2種類の実装を書いてください。最初のバージョンは`foldHRec`関数を使用する必要があります。２つめのバージョンは、外部関数として定義しなければなりません。**ヒント**：次のような関数の定義を探してみると参考になるかもしれません。
> 
>     ```haskell
>     lookupHelper :: forall a r. Fn4 r (a -> r) String (HRec a) r
>     ```
> 
>     第１引数及び第2引数は、それぞれ `Nothing`と` Just`関数に対応しています。
>     
> 1. (難しい) マッピング関数が追加の引数としてプロパティのラベルを受け取る`mapHRec`関数書いてください。その関数を使用して`HRec`の`Show`インスタンスを簡素化してください。

## 副作用の表現

`Eff`モナドもPreludeの外部型として定義されています。その実行時表現はとても簡単です。型`Eff eff a`の式は、任意の副作用を実行し型`a`の適切な実行時表現で値を返す、引数なしのJavaScript関数へと評価されます。

`Eff`型の構築子の定義は、`Control.Monad.Eff`モジュールで次のように与えられています。

```haskell
foreign import data Eff :: # ! -> * -> *
```

`Eff`型の構築子は作用の行と返り値の型によってパラメータ化されおり、それが種に反映されることを思い出してください。

簡単な例として、`purescript-random`パッケージで定義される` random`関数を考えてみてください。その型は次のようなものでした。

```haskell
random :: forall eff. Eff (random :: Random) Number
```

`random`関数の定義は次のように与えられます。

```haskell
foreign import random
  "function random() {\
  \  return Math.random();\
  \}" :: forall eff. Eff (random :: Random | eff) Number
```

`random`関数は実行時には引数なしの関数として表現されていることに注目してください。これは乱数生成という副作用を実行しそれを返しますが、返り値は`Number`型の実行時表現と一致します。それは`null`でないJavaScriptの数です。

もう少し興味深い例として、 Preludeの`Debug.Trace`モジュールで定義された` trace`関数を考えてみましょう。`trace`関数は次の型を持っています。

```haskell
forall eff. String -> Eff (trace :: Trace | eff) Unit
```

この定義は次のようになっています。

```javascript
foreign import trace
  "function trace(s) {\
  \  return function() {\
  \    console.log(s);\
  \    return {};\
  \  };\
  \}" :: forall eff. String -> Eff (trace :: Trace | eff) Unit
```

実行時の`trace`の表現は、引数なしの関数を返す、単一の引数のJavaScript関数です。内側の関数はコンソールにメッセージを書き込むという副作用を実行し、空のレコードを返します。`Unit`は空のレコード型のnewtypeとしてPreludeで定義されているので、内側の関数の戻り値の型は`Unit`型の実行時表現と一致していることに注意してください。

作用`Random`と`Trace`も外部型として定義されています。その種は`!`、つまり作用であると定義されています。例えば次のようになります。

```haskell
foreign import data Random :: !
```

詳しくはあとで見ていきますが、このように新たな作用を定義することが可能なのです。

`Eff eff a`型の式は、通常のJavaScriptのメソッドのようにJavaScriptから呼び出すことができます。例えば、この`main`関数は作用の集合`eff`と何らかの型`a`について`Eff eff a`という型でなければならないので、次のように実行することができます。

```javascript
PS.Main.main();
```

または、CommonJSの環境では次のようにします。

```javascript
require('Main').main();
```

`psc`コンパイラを使用するときは、コマンドライン上で `--main`コンパイラオプションを使用すると、この`main`の呼び出しを自動的に生成することができます。

## 新しい作用の定義

この章のソースコードでは、2つの新しい作用が定義されています。最も簡単なのは`Control.Monad.Eff.Alert`モジュールで定義された`Alert`作用です。これはその計算がポップアップウィンドウを使用してユーザに警告しうることを示すために使われます。

この作用は最初に外部型宣言を使用して定義されています。

```haskell
foreign import data Alert :: !
```

`Alert`は種`!`が与えられており、`Alert`が型ではなく作用であることを示しています。

次に、`alert`アクションが定義されています。`alert`アクションはポップアップを表示し、作用の行に`Alert`作用を追加します。

```haskell
foreign import alert
  "function alert(msg) {\
  \  return function() {\
  \    window.alert(msg);\
  \    return {};\
  \  };\
  \}" :: forall eff. String -> Eff (alert :: Alert | eff) Unit
```

このアクションは`Debug.Trace`モジュールの`trace`アクションととてもよく似ています。唯一の違いは、`trace`アクションが`console.log`メソッドを使用しているのに対し、`alert`アクションは`window.alert`メソッドを使用していることです。このように、`alert`は`window.alert`が定義されているウェブブラウザのような環境で使用することができます。

`trace`の場合のように、`alert`関数は型`Eff (alert :: Alert | eff) Unit`の計算を表現するために引数なしの関数を使っていることに注意してください。

この章で定義される２つめの作用は、`Control.Monad.Eff.Storage`モジュールで定義されている`Storage`作用です。これは計算がWeb Storage APIを使用して値を読み書きする可能性があることを示すために使われます。

この作用も同じように定義されています。

```haskell
foreign import data Storage :: !
```

`Control.Monad.Eff.Storage`モジュールには、ローカルストレージから値を取得する`getItem`と、ローカルストレージに値を挿入したり値を更新する`setItem`という、２つのアクションが定義されています。この二つの関数は、次のような型を持っています。

```haskell
getItem :: forall eff. String -> Eff (storage :: Storage | eff) Foreign
setItem :: forall eff. String -> String -> Eff (storage :: Storage | eff) Unit
```

興味のある読者は、このモジュールのソースコードでこれらのアクションがどのように定義されているか調べてみてください。

`setItem`はキーと値(両方とも文字列)を受け取り、指定されたキーでローカルストレージに値を格納する計算を返します。

`getItem`の型はもっと興味深いものです。`getItem`はキーを引数に取り、キーに関連付けられた値をローカルストレージから取得しようとします。`window.localStorage`の`getItem`メソッドは`null`を返すことがあるので、返り値は`String`ではなく、`purescript-foreign`パッケージの`Data.Foreign`モジュールで定義されている`Foreign`になっています。

`Data.Foreign`は、**型付けされていないデータ**、もっと一般的にいえば実行時表現が不明なデータを扱う方法を提供しています。

> ## 演習 {-}
> 
> 1. (やや難しい) JavaScriptの`Window`オブジェクトの`confirm`メソッドのラッパを書き、`Control.Monad.Eff.Alert`モジュールにその関数を追加してください。
> 
> 1. (やや難しい) `localStorage`オブジェクトの`removeItem`メソッドのラッパを書き、`Control.Monad.Eff.Storage`モジュールに追加してください

## 型付けされていないデータの操作

この節では、型付けされていないデータを、その型の適切な実行時表現を持った型付けされたデータに変換する、`Data.Foreign`ライブラリの使い方について見て行きます。 

この章のコードは、第8章の住所録の上にフォームの一番下に保存ボタンを追加することで作っていきます。保存ボタンがクリックされると、フォームの状態をJSONに直列化し、ローカルストレージに格納します。ページが再読み込みされると、JSON文書がローカルストレージから取得され、構文解析されます。

`Main`モジュールではフォームデータの型を定義します。

```haskell
newtype FormData = FormData
  { firstName  :: String
  , lastName   :: String
  , street     :: String
  , city       :: String
  , state      :: String
  , homePhone  :: String
  , cellPhone  :: String
  }
```

問題は、このJSONが正しい形式を持っているという保証がないことです。別の言い方をすれば、JSONが実行時にデータの正しい型を表しているかはわかりません。この問題は`purescript-foreign`ライブラリによって解決することができます。他にも次のような使いかたがあります。

- WebサービスからJSONレスポンス
- JavaScriptコードから関数に渡された値

それでは、`psci`で`purescript-foreign`ライブラリを試してみましょう。二つのモジュールをインポートして起動します。

```text
> :i Data.Foreign
> :i Data.Foreign.Class
```

`Foreign`な値を取得するためには、JSON文書を解析するのがいいでしょう。`purescript-foreign`はで次の2つの関数が定義されています。

```haskell
parseJSON :: String -> F Foreign
readJSON :: forall a. (IsForeign a) => String -> F a
```

型構築子`F`は、実際は`Data.Foreign`で定義されている型同義語です。

```haskell
type F = Either ForeignError
```

`purescript-foreign`ライブラリの関数のほとんどは、`F`モナドの値を返します。これは、型付けされた値を構築するのに、do記法やApplicative関手コンビネータを使うことができることを意味しています。

この`IsForeign`型クラスは、それらの型が型付けされていないデータから得られることを表しています。プリミティブ型や配列について定義された型クラスインスタンスは存在しますが、独自のインスタンスを定義することもできます。

それでは`psci` で`readJSON`を使用していくつかの簡単なJSON文書を解析してみましょう。

```text
> readJSON "\"Testing\"" :: F String
Right "Testing"

> readJSON "true" :: F Boolean 
Right true

> readJSON "[1, 2, 3]" :: F [Number]
Right [1, 2, 3]
```

`Either`モナドでは`Right`データ構築子は成功を示していることを思い出してください。しかし、その不正なJSONや誤った型はエラーを引き起こすことに注意してください。

```text
> readJSON "[1, 2, true]" :: F [Number]

Left (Error at array index 2: Type mismatch: expected Number, found Boolean)
```

`purescript-foreign`ライブラリはJSON文書で型エラーが発生した位置を教えてくれます。

## nullとundefined値の取り扱い

実世界のJSON文書にはnullやundefined値が含まれているので、それらも扱えるようにしなければなりません。

`purescript-foreign`では、この問題を解決する3種類の構築子、`Null`、`Undefined`、`NullOrUndefined`が定義されています。先に定義した`Undefined`型の構築子と似た目的を持っていますが、省略可能な値を表すために`Maybe`型の構築子を内部的に使っています。

それぞれの型の構築子について、ラップされた値から内側の値を取り出す関数、`runNull`、`runUndefined` `runNullOrUndefined`が提供されています。`null`値を許容するJSON文書を解析するには、`readJSON`アクションまで対応する適切な関数を持ち上げます。

```text
> runNull <$> readJSON "42" :: F (Null Number)
Right (Just 42)

> runNull <$> readJSON "null" :: F (Null Number)
Right Nothing
```

それぞれの場合で、型注釈が`<$>`演算子の右辺に適用されています。たとえば、`readJSON "42"`は型`F (Null Number)`を持っています。`runNull`関数は最終的な型`F (Maybe Number)`与えるために`F`まで持ち上げられます。

型`NULL Number`は数またはnullいずれかの値を表しています。各要素が`null`をかもしれない数値の配列のように、より興味深いの値を解析したい場合はどうでしょうか。その場合には、次のように`readJSON`アクションまで関数`map runNull`を持ち上げます。

```text
> :i Data.Array

> map runNull <$> readJSON "[1, 2, null]" :: F [Null Number]
Right [Just 1, Just 2, Nothing]
```

一般的には、同じ型に異なる直列化戦略を提供するには、newtypesを使って既存の型をラップするのがいいでしょう。`null`、` Undefined`、`NullOrUndefined`それぞれの型は、`Maybe`型構築子に包まれたnewtypeとして定義されています。

## 住所録の項目の直列化

フォームデータは`JSON.strongify`メソッドを使用して直列化されますが、これは`Data.JSON`モジュールで定義されている次の関数でラップされています。

```haskell
foreign import stringify
  "function stringify(x) {\
  \  return JSON.stringify(x);\
  \}" :: Foreign -> String
```

保存ボタンをクリックすると、型`FormData`の値が(`Foreign`の値に変換されたあとで)`stringify`関数に渡され、JSON文書として直列化されます。`FormData`型はレコードのnewtypeで、`JSON.stringify`が渡された型`FormData`の値はJSON**オブジェクト**として扱われて直列化されます。newtypeはその基礎となるデータと同じ実行時表現を持っているためです。

生成されたJSONドキュメントを解析できるようにするためには、オブジェクトのプロパティを読み取れるようにしなければなりません。`purescript-foreign`ライブラリはその機能を`(!)`演算子と`readProp`アクションによって提供しています。

```haskell
(!) :: (Index i) => Foreign -> i -> F Foreign
readProp :: forall a i. (IsForeign a, Index i) => i -> Foreign -> F a
```

型クラス`Index`は外部値のプロパティをインデックスするために使われる型を表しています。`Index`のインスタンスは`String`(オブジェクトプロパティにアクセスするため)と`Number`(配列要素にアクセスするため)に対して提供されています。

`readProp`アクションを使うと、`FormData`型の`IsForeign`のインスタンスを定義することができます。次のように`IsForeign`型クラスで定義されている`read`関数を実装する必要があります。

```haskell
class IsForeign a where
  read :: Foreign -> F a
```

`read`関数を実装するには、`F`の`Monad`構造を使って小さな部分から`FormData`構造体を次のように作っていきます。

```haskell
instance formDataIsForeign :: IsForeign FormData where
  read value = do
    firstName   <- readProp "firstName" value
    lastName    <- readProp "lastName"  value
    street      <- readProp "street"    value
    city        <- readProp "city"      value
    state       <- readProp "state"     value
    homePhone   <- readProp "homePhone" value
    cellPhone   <- readProp "cellPhone" value
    return $ FormData
      { firstName  : firstName
      , lastName   : lastName
      , street     : street
      , city       : city
      , state      : state
      , homePhone  : homePhone
      , cellPhone  : cellPhone
      }
```

`FormData`の構築子関数を`F`型構築子まで持ち上げると、このコードを`F`の`Applicative`構造を使って書くこともできます。これは演習として残しておきます。

この型クラスのインスタンスは、ローカル·ストレージから取得したJSON文書を解析するために`readJSON` で次のように使われています。

```haskell
loadSavedData = do
  item <- getItem "person"
  
  let
    savedData :: F (Maybe FormData)
    savedData = do
      jsonOrNull <- read item
      traverse readJSON (runNull jsonOrNull)
```

`savedData`アクションは２つのステップにわけて`FormData`構造を読み取ります。まず、`getItem`から得た`Foreign`値を解析します。`jsonOrNull`の型はコンパイラによって`Null String`だと推論されます(読者への演習：　この型はどのように推論されているのでしょうか？)。`traverse`関数は`readJSON`を`Maybe.String`型の結果の(不足しているかもしれない)要素へと適用するのに使われます。`readJSON`について推論される型クラスのインスタンスはちょうどさっき書いたもので、型`F (Maybe FormData)`の値で結果を返します。

`traverse`の引数には`read`が最初の行で得た結果`jsonOrNull`を使っているので、`F`のモナド構造を使う必要があります。

結果の`FormData`には3つの可能性があります。

- もし外側の構築子が `Left`なら、JSON文字列の解析中にエラーがあったか、それが間違った型の値を表しています。この場合、アプリケーションは先ほど書いた `alert`アクションを使用してエラーを表示します。
- もし外側の構築子が `Right`で内側の構築子が`Nothing`なら、`getItem`が` Nothing`を返しており、キーがローカルストレージに存在していなかったことを意味しています。この場合、アプリケーションは静かに実行を継続します。
- 最後に、`Right (Just _)`に適合した値はJSON文書としてただしく構文解析されたことを示しています。この場合、アプリケーションは適切な値でフォームフィールドを更新します。

`grunt`を実行し、それからブラウザで[`http://localhost:8000`](http://localhost:8000/)を開いて、これらのコードを試してみてください。保存ボタンをクリックするとフォームフィールドの内容をローカルストレージへ保存することができ、ページを再読込するとフィールドが再現されるはずです。

> ## 演習 {-}
> 
> 1. (簡単) `readJSON`を使って、`[[1, 2, 3], [4, 5], [6]]`のようなJavaScriptの数の２次元配列を表現するJSON文書を解析してください。 要素をnullにすることが許容されている場合はどうでしょうか。配列自体がnullにすることが許容されている場合はどうなりますか。
> 
> 1. (やや難しい) Applicativeコンビネータ`<$> `と`<*>`を使って`formDataIsForeign`型クラスを書きなおしてください。
> 
> 1. (やや難しい) `savedData`の実装の型を検証し、計算のそれぞれの部分式の推論された型を書き出してみましょう。
> 
> 1. (難しい) 次のnewtype型は、**タグ付き**共用体として直列化されなければならない`Either a b`の型の値を表しています。 
> 
>     ```haskell
>     newtype Tagged a b = Tagged (Either a b)
>     ```
> 
>     つまり、直列化されたJSON文書には`Left`構築子と`Right`構築子のどちらが値を構築するのに使われたかということを表すプロパティ`tag`を含まなければいけません。実際の値は、JSON文書の`value`のプロパティに格納される必要があります。
> 
>     例えば、JSONデータ`{ tag: "Left", value: 0 }`は`Left 0`へと復元されなければいけません。
> 
>     この`Tagged`型構築子の`IsForeign`についての妥当なインスタンスを書いてください。
>     
> 1. (難しい、拡張)次のデータ型は、葉で値を持つ二分木を表しています。
> 
>     ```haskell
>     data Tree a = Leaf a | Branch (Tree a) (Tree a)
>     ```
> 
>     JSONドキュメントとしてこの型の適切な表現を選択してください。`JSON.stringify`と中間のレコードのnewtypeを使って二分木をJSONへ直列化する関数を書き、関連する`IsForeign`のインスタンスを書いてください。

## まとめ

この章では、PureScriptから外部のJavaScriptコードを扱う方法、およびその逆の方法を学びました。また、FFIを使用して信頼できるコードを書く時に生じる問題について見てきました。

- データの**実行時表現**の重要性を見て、外部関数が正しい表現を持っていることを確かめました。
- 外部型、つまり`Foreign`データ型を使用することによって、null値のような特殊な場合やJavaScriptの他の型のデータに対処する方法を学びました。
- Preludeで定義されたいくつかの共通の外部型、既存のJavaScriptコードとどのように相互運用に使用するかを見てきました。特に、`Eff`モナドにおける副作用の表現を導入し、新たな副作用を追跡するために`Eff`モナドを使用する方法を説明しました。
- `IsForeign`型クラスを使用して安全にJSONデータを復元する方法を説明しました。

その他の例については、Githubの`purescript`組織および`purescript-contrib`組織が、FFIを使用するライブラリの例を多数提供しています。残りの章では、型安全な方法で現実世界の問題を解決するために使うライブラリを幾つか見ていきます。




