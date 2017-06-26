# テストの自動生成

## この章の目標

この章では、テスティングの問題に対する、型クラスの特に洗練された応用について示します。**どのようにテストするのかを**コンパイラに教えるのではなく、コードが**どのような性質を持っているべきか**を教えることでテストします。型クラスを使って無作為データ生成のための定型コードを隠し、テストケースを仕様から無作為に生成することができます。これは**生成的テスティング**(generative testing、またはproperty-based testing）と呼ばれ、Haskellの[QuickCheck](http://www.haskell.org/haskellwiki/Introduction_to_QuickCheck1)ライブラリによって知られるようになった手法です。

`purescript-quickcheck`パッケージはHaskellのQuickCheckをライブラリをPureScriptにポーティングしたもので、型や構文はもとのライブラリとほとんど同じようになっています。`purescript-quickcheck`を使って簡単なライブラリをテストし、Gruntでテストスイートを自動化されたビルドに統合する方法を見ていきます。

## プロジェクトの準備

この章のプロジェクトにはBower依存関係として`purescript-quickcheck`が追加されます。実際には、`purescript-quickcheck`は`bower.json` の`devDependencies`セクションに追加されます。

```javascript
  "devDependencies": {
    "purescript-quickcheck": "~0.1.3"
  }
```

これは `purescript-quickcheck`は開発時のみ必要であることを示しています。製品ビルドのときは QuickCheck ライブラリコードを出力に含むのを避けるため、 `bower`コマンドで`--production`フラグを使ってください。

```text
$ bower update --production

$ grunt build
```

## テストの自動化

このプロジェクトの `Gruntfile.js`ファイルは、テストスイートをサポートするために少し変更されています。

まず、`psc`タスクに新しいセクションが追加されています。これはソースコードをテストスイートのコードと一緒にビルドし、副次的なJavaScriptファイルを出力するようにします。

```javascript
psc: {
  lib: {
    src: ["<%=srcFiles%>"],
    dest: "dist/Main.js"
  },
  tests: {
    options: {
      module: ["Main"],
      main: true
    },
    src: ["tests/Main.purs", "<%=srcFiles%>"],
    dest: "dist/tests.js"
  }
}
```

`psc:tests`タスクはテストスイートを実行するためにの追加の`dist/tests.js`ファイルを生成するようになっています。次の手順は、`grunt-execute`パッケージを使って、このプロセスを自動化することです。

```javascript
execute: {
  tests: {
    src: "dist/tests.js"
  }
}
```

`grunt-execute`パッケージもNPMの​依存関係として追加されます。最後に、Gruntタスクリストにタスクとしてこれを追加する必要があります。

```javascript
grunt.loadNpmTasks("grunt-execute");

grunt.registerTask("build", 
  ["psc:lib", "dotPsci"]);
grunt.registerTask("test", 
  ["build", "psc:tests", "execute:tests"]);
```

これで、ライブラリのソースコードだけをビルドする`build`、ライブラリとテストスイートをビルドしテストも実行する`test`の、2つのタスクが新しく利用できるようになります。

## プロパティの書き込み

`Merge.purs`ファイルでは`purescript-quickcheck`ライブラリの機能を実演するために使う簡単な関数`merge`が実装されています。

```haskell
merge :: [Number] -> [Number] -> [Number]
```

`merge`は2つのソートされた数の配列をとって、その要素を統合し、ソートされた結果を返します。例えば次のようになります。

```text
> :i Merge
> merge [1, 3, 5] [2, 4, 6]

[1, 2, 3, 4, 5, 6]
```

典型的なテストスイートでは、手作業でこのような小さなテストケースをいくつも作成し、結果が正しい値と等しいことを確認することでテスト実施します。しかし、`merge`関数について知る必要があるものはすべて、2つの性質に要約することができます。

- (既ソート性) `xs`と`ys`がソート済みなら、`merge xs ys`もソート済みになります。
- （部分配列） `xs`と`ys`ははどちらも`merge xs ys`の部分配列で、要素は元の配列と同じ順序で現れます。

`purescript-quickcheck`では、無作為なテストケースを生成することで、直接これらの性質をテストすることができます。コードが持つべき性質を、次のような関数として述べるだけです。

```haskell
main = do
  quickCheck $ \xs ys -> 
    isSorted $ merge (sort xs) (sort ys)
  quickCheck $ \xs ys -> 
    xs `isSubarrayOf` merge xs ys
```

ここで、`isSorted`と`isSubarrayOf`は次のような型を持つ補助関数として実装されています。

```haskell
isSorted :: forall a. (Ord a) => [a] -> Boolean
isSubarrayOf :: forall a. (Eq a) => [a] -> [a] -> Boolean
```

このコードを実行すると、 `purescript-quickcheck`は無作為な入力` xs`と `ys`を生成してこの関数に渡すことで、主張しようとしている性質を反証しようとします。何らかの入力に対して関数が`false`を返した場合、性質は正しくないことが示され、ライブラリはエラーを発生させます。幸いなことに、次のように100個の無作為なテストケースを生成しても、ライブラリはこの性質を反証することができません。

```text
$ grunt

Running "execute:tests" (execute) task
-> executing dist/tests.js
100/100 test(s) passed.
100/100 test(s) passed.
-> completed dist/tests.js

>> 1 file and 0 calls executed

Done, without errors.
```

もし`merge`関数に意図的にバグを混入した場合（例えば、大なりのチェックを小なりのチェックへと変更するなど）、最初に失敗したテストケースの後で例外が実行時に投げられます。

```text
Error: Test 1 failed: 
Test returned false
```

このエラーメッセージではあまり役に立ちませんが、これから見ていくように、少しの作業で改良することができます。

## エラーメッセージの改善

テストケースが失敗した時に同時にエラーメッセージを提供するには、`purescript-quickcheck`の`<?>`演算子を使います。次のように性質の定義に続けて`<?>`で区切ってエラーメッセージを書くだけです。

```haskell
quickCheck $ \xs ys -> 
  let
    result = merge xs ys 
  in 
    xs `isSubarrayOf` result <?> show xs ++ " not a subarray of " ++ show result
```

このとき、もしバグを混入するようにコードを変更すると、最初のテストケースが失敗したときに改良されたエラーメッセージが表示されます。

```text
Error: Test 6 failed: 
[0.85] not a subarray of [0.89,0.82,0.44,0.01]
```

入力`xs`が無作為に選ばれた数の配列として生成されていることに注目してください。

> ## 演習 {-}
> 
> 1. （簡単）　空の配列を持つ配列を統合しても元の配列は変更されない、と主張する性質を書いてください。
> 
> 1. （簡単） `merge`の残りの性質に対して、適切なエラーメッセージを追加してください。

## 多相的なコードのテスト

`Merge`モジュールでは、数の配列だけでなく、`Ord`型クラスに属するどんな型の配列に対しても動作する、`merge`関数を一般化した`mergePoly`という関数が定義されています。

```haskell
mergePoly :: forall a. (Ord a) => [a] -> [a] -> [a]
```

`merge`の代わりに`mergePoly`を使うように元のテストを変更すると、次のようなエラーメッセージが表示されます。

```text
Error in declaration main
No instance found for Testable ([u1] -> [u1] -> Boolean)
```

このエラーメッセージは、配列に持たせたい要素の型が何なのかわからないので、コンパイラが無作為なテストケースを生成できなかったということを示しています。このような場合、補助関数を使と、コンパイラが特定の型を推論すること強制できます。例えば、恒等関数の同義語として`numbers`という関数を定義します。

```haskell
numbers :: [Number] -> [Number]
numbers = id
```

それから、コンパイラが引数の２つの配列の型 `[Number]` を推論するように、テストを変更します。

```haskell
quickCheck $ \xs ys -> 
  isSorted $ numbers $ mergePoly (sort xs) (sort ys)
quickCheck $ \xs ys -> 
  numbers xs `isSubarrayOf` mergePoly xs ys
```

ここで、`numbers`関数が不明な型を解消するために使われるので、`xs`と`ys` はどちらも型`[Number]`を持っています。

> ## 演習 {-}
> 
> 1. (簡単) `xs`と`ys`の型を`[Boolean]`に強制する関数`bools`を書き、`mergePoly`をその型でテストする性質を追加してください。
> 
> 1. (やや難しい) 標準関数から(例えば`purescript-arrays`パッケージから)ひとつ関数を選び、適切なエラーメッセージを含めてQuickCheckの性質を書いてください。その性質は、補助関数を使って多相型引数を`Number`か`Boolean`のどちらかに固定しなければいけません。

## 任意のデータの生成

`purescript-quickcheck`ライブラリを使って性質についてのテストケースを無作為に生成する方法について説明します。

無作為に値を生成することができるような型は、次のような型クラス`Arbitary`のインスタンスを持っています。

```haskell
class Arbitrary t where
  arbitrary :: Gen t
```

`Gen`型構築子は**決定的無作為データ生成**の副作用を表しています。 決定的無作為データ生成は、擬似乱数生成器を使って、シード値から決定的無作為関数の引数を生成します。`Gen`はモナドでもApplicative関手でもあるので、`Arbitary`型クラスの新しいインスタンスを作成するのに、いつも使っているようなコンビネータを自由に使うことができます。

例えば、`purescript-quickcheck`ライブラリで提供されている`Number`型の`Arbitrary`インスタンスは、0と1の間に均一に分布した値を生成します。もし異なる分布を持った数を生成する`Arbitary`インスタンスを持った型を定義したい場合は、`Applicative`インスタンスを使うと、関数適用によって、均一な無作為な変数を、次のような無作為な値へと変換することができます。

```haskell
newtype Byte = Byte Number

instance arbitraryByte :: Arbitary Byte where
  arbitrary = uniformToByte <$> arbitrary
    where
    uniformToByte n = Math.floor (n * 256)
```

ここでは、0から255までの間の整数値であるような型`Byte`を定義しています。`Arbitrary`インスタンスの`<$>`演算子を使って、`uniformToByte`関数を`arbitrary`アクションまで持ち上げています。この型の`arbitrary`アクションの型は`Gen Number`だと推論されますが、これは0から1の間に均一に分布する数を生成することを意味しています。



この考え方を`merge`に対しての既ソート性テストを改良するのに使うこともできます。

```haskell
quickCheck $ \xs ys -> 
  isSorted $ numbers $ mergePoly (sort xs) (sort ys)
```

このテストでは、任意の配列`xs`と`ys`を生成しますが、`merge`はソート済みの入力を期待しているので、`xs`と`ys`をソートしておかなければなりません。一方で、ソートされた配列を表すnewtypeを作成し、ソートされたデータを生成する`Arbitrary`インスタンスを書くこともできます。

```haskell
newtype Sorted a = Sorted [a]

sorted :: forall a. Sorted a -> [a]
sorted (Sorted xs) = xs

instance arbSorted :: (Arbitrary a, Ord a) => Arbitrary (Sorted a) where
  arbitrary = Sorted <<< sort <$> arbitrary
```

この型構築子を使うと、テストを次のように変更することができます。

```haskell
quickCheck $ \xs ys -> 
  isSorted $ numbers $ mergePoly (sorted xs) (sorted ys)
```

これは些細な変更に見えるかもしれませんが、`xs`と`ys`の型はただの`[Number]`から`Sorted Number`へと変更されています。これにより、`mergePoly`関数はソート済みの入力を取る、という**意図**を、わかりやすく示すことができます。理想的には、 `mergePoly`関数自体の型が`Sorted`型構築子を使うようにするといいでしょう。

より興味深い例として、`Tree.purs`ファイルでは枝の値でソートされた二分木の型が定義されています。

```haskell
data Tree a
  = Leaf
  | Branch (Tree a) a (Tree a)
```

`Tree`モジュールでは次のAPIが定義されています。

```haskell
insert :: forall a. (Ord a) => a -> Tree a -> Tree a
member :: forall a. (Ord a) => a -> Tree a -> Boolean

toArray :: forall a. Tree a -> [a]
fromArray :: forall a. (Ord a) => [a] -> Tree a
```

`insert`関数は新しい要素をソート済みの二分木に挿入するのに使われ、`member`関数は特定の値の有無を木に問い合わせるのに使われます。例えば次のようになります。

```text
> :i Tree

> member 2 $ insert 1 $ insert 2 Leaf
true

> member 1 Leaf
false
```

`toArray`関数と`fromArray`関数は、ソートされた木とソートされた配列を相互に変換するために使われます。`fromArray`を使うと、木についての`Arbitrary`インスタンスを書くことができます。

```haskell
instance arbTree :: (Arbitrary a, Ord a) => Arbitrary (Tree a) where
  arbitrary = fromArray <<< sorted <$> arbitrary
```

`fromArray`への入力がソートされた配列であることを保証するために、ここで`sort`関数を使っていることに注意してください。

型`a`についての有効な`Arbitary`インスタンスが存在していれば、テストする性質の引数の型として`Tree a`を使うことができます。例えば、`member`テストは値を挿入した後は常に`true`を返すことをテストできます。

```haskell
quickCheck $ \t a -> 
  member a $ insert a (t :: Tree Number) 
```

ここでは、引数`t`は`Tree Number`型の無作為に生成された木です。

> ## 演習 {-}
> 
> 1. （やや難しい） `a-z`の範囲から無作為に選ばれた文字の集まりを生成する`Arbitrary`インスタンスを持った、`String`のnewtypeを作ってください。**ヒント**： `[Number]`の`Arbitrary`インスタンスと、 型`[Number] -> String`を持つ関数を使ってください。
> 
> 1. （難しい） 木に挿入された値は、任意に多くの挿入があった後も、その木の構成要素であることを主張する性質を書いてください。

## 高階関数のテスト

`Merge`モジュールは`merge`関数についての他の生成も定義します。`mergeAith`関数は、統合される要素の順序を決定するのに使われる、追加の関数を引数としてとります。つまり`mergeWith`は高階関数です。

例えば、すでに長さの昇順になっている２つの配列を統合するのに、`length`関数を最初の引数として渡します。このとき、結果も長さの昇順になっていなければなりません。

```haskell
> :i Data.String
> mergeWith length 
    ["", "ab", "abcd"] 
    ["x", "xyz"]

["","x","ab","xyz","abcd"]
```

このような関数をテストするにはどうしたらいいでしょうか。理想的には、関数であるような最初の引数を含めた、３つの引数すべてについて、値を生成したいと思うでしょう。

関数を無作為に生成せきるようにする、もうひとつの型クラスがあります。この型クラスは`CoArbitrary`と呼ばれており、次のように定義されています。

```haskell
class CoArbitrary t where
  coarbitrary :: forall r. t -> Gen r -> Gen r
```

`coarbitrary`関数は、型`t`と、関数の結果の型`r`についての無作為な生成器を関数の引数としてとり、無作為な生成器を**かき乱す**のにこの引数を使います。つまり、この引数を使って、乱数生成器の無作為な出力を変更しているのです。

また、もし関数の定義域が`CoArbitrary`で、値域が`Arbitrary`なら、`Arbitrary`の関数を与える型クラスインスタンスが存在しています。

```haskell
instance arbFunction :: (CoArbitrary a, Arbitrary b) => Arbitrary (a -> b)
```

実は、これが意味しているのは、引数として関数を取るような性質を記述できるということです。`mergeWith`関数の場合では、新しい引数を考慮するようにテストを修正すると、最初の引数を無作為に生成することができます。

既ソート性の性質については、必ずしも`Ord`インスタンスを持っているとは限らないので、結果がソートされているということを保証することができませんが、引数として渡す関数`f`にしたがって結果がソートされている期待することはできます。さらに、２つの入力配列が`f`に従ってソートされている必要がありますので、`sortBy`関数を使って関数`f`が適用されたあとの比較に基づいて`xs`と`ys`をソートします。

```haskell
quickCheck $ \xs ys f -> 
  isSorted $ 
    map f $ 
      mergeWith (numberToBool f) 
                (sortBy (compare `on` f) xs) 
                (sortBy (compare `on` f) ys)
```

ここでは、関数`f`の型を明確にするために、関数`numberToBool`を使用しています。

```haskell
numberToBool :: (Number -> Boolean) -> Number -> Boolean
numberToBool = id
```

部分配列性については、単に関数の名前を`mergeWith`に変えるだけです。引き続き入力配列は結果の部分配列になっていると期待できます。

```haskell
quickCheck $ \xs ys f -> 
  xs `isSubarrayOf` mergeWith (numberToBool f) xs ys
```

関数は`Arbitrary`であるだけでなく`CoArbitrary`でもあります。

```haskell
instance coarbFunction :: (Arbitrary a, CoArbitrary b) => CoArbitrary (a -> b)
```

これは値の生成が単純な関数だけに限定されるものではないことを意味しています。つまり、**高階関数**や、引数が高階関数であるような関数すら無作為に生成することができるのです。

## CoArbitraryのインスタンスを書く

`Gen`の`Monad`や`Applicative`インスタンスを使って独自のデータ型に対して`Arbitrary`インスタンスを書くことができるのとちょうど同じように、独自の`CoArbitrary`インスタンスを書くこともできます。これにより、無作為に生成される関数の定義域として、独自のデータ型を使うことができるようになります。

`Tree`型の`CoArbitrary`インスタンスを書いてみましょう。枝に格納されている要素の型に`CoArbitrary`インスタンスが必要になります。

```haskell
instance coarbTree :: (CoArbitrary a) => CoArbitrary (Tree a) where
```

型`Tree a`の値を与えられた乱数発生器をかき乱す関数を記述する必要があります。入力値が `Leaf`であれば、そのままの生成器を返します。

```haskell
  coarbitrary Leaf = id
```

もし木が`Branch`なら、
関数合成で独自のかき乱し関数を作ることにより、
左の部分木、値、右の部分木を使って生成器をかき乱します。

```haskell
  coarbitrary (Branch l a r) =
    coarbitrary l <<<
    coarbitrary a <<<
    coarbitrary r
```

これで、木を引数にとるような関数を含む性質を自由に書くことができるようになりました。たとえば、`Tree`モジュールでは述語が引数のどんな部分木についても成り立っているかを調べる関数`anywhere`が定義されています。

```haskell
anywhere :: forall a. (Tree a -> Boolean) -> Tree a -> Boolean
```

これで、無作為にこの述語関数`anywhere`を生成することができるようになりました。例えば、`anywhere`関数が次のような**ある命題のもとで不変**であることを期待します。

```haskell
quickCheck $ \f g t ->
  anywhere (\s -> f s || g s) t ==
    anywhere f (treeOfNumber t) || anywhere g t
```

ここで、`treeOfNumber`関数は木に含まれる値の型を型` Number`に固定するために使われています。

```haskell
treeOfNumber :: Tree Number -> Tree Number
treeOfNumber = id
```

## 副作用のないテスト

テストの目的では通常、テストスイートの `main`アクションには`quickCheck`関数の呼び出しが含まれています。しかし、副作用を使わない`quickCheckPure`と呼ばれる`quickCheck`関数の亜種もあります。`quickCheckPure`は、入力として乱数の種をとり、テスト結果の配列を返す純粋な関数です。

`psci`を使用して` quickCheckPure`を使ってみましょう。ここでは `merge`操作が結合法則を満たすことをテストしてみます。

```text
> :i Test.QuickCheck
> :i Merge

> quickCheckPure 12345 10 $ \xs ys zs -> 
    ((xs `merge` ys) `merge` zs) == 
      (xs `merge` (ys `merge` zs))
  
[Success, Success, ..., Success]
```

`quickCheckPure`は乱数の種、生成するテストケースの数、テストする性質の３つの引数をとります。もしすべてのテストケースに成功したら、`Success`データ構築子の配列がコンソールに出力されます。

`quickCheckPure`は、性能ベンチマークの入力データ生成や、ウェブアプリケーションのフォームデータ例を無作為に生成するというような状況で便利かもしれません。

> ## 演習 {-}
> 
> 1. （簡単） `Byte`と`Sorted`型構築子についての `CoArbitrary`インスタンスを書いてください。
> 
> 1. （やや難しい）任意の関数 `f`について、`mergeWith f`関数の結合性を主張する(高階)性質を書いてください。`quickCheckPure`を使って`psci`でその性質をテストしてください。
> 
> 1. （やや難しい）次のデータ型の `CoArbitrary`インスタンスを書いてください。
> 
>     ```haskell
>     data OneTwoThree a = One a | Two a a | Three a a a
>     ```
> 1. (やや難しい) `all`関数を使って`quickCheckPure`関数の結果を単純化してください。その関数はもしどんなテストもパスするなら`true`を返し、そうでなければ`false`を返さなくてはいけません。`purescript-monoids`で定義されている`First`モノイドを
、失敗時の最初のエラーを保存するために`foldMap`関数と一緒に使ってみてください。

## まとめ

この章では、生成的テスティングのパラダイムを使って宣言的な方法でテストを書くための、`purescript-quickcheck`パッケージを導入しました。

- Grunt使ってQuickCheckをテストを自動化する方法を説明しました。
-  エラーメッセージを改良する`<?>`演算子の使い方と、性質を関数として書く方法を説明しました。
- `Arbitrary`と` CoArbitrary`型クラスは、定型的なテストコードの自動生成を可能にし、高階性質関数を可能にすることも説明しました。
- 独自のデータ型に対して`Arbitrary`と` CoArbitrary`インスタンスを実装する方法を説明しました。

