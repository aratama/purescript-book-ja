# キャンバスグラフィックス

## この章の目標

この章のコード例では、PureScriptでHTML5のCanvas APIを使用して2Dグラフィックスを生成する`purescript-canvas`パッケージに焦点をあててコードを拡張していきます。

## プロジェクトの準備

このモジュールのプロジェクトでは、以下のBowerの依存関係が新しく追加されています。

- `purescript-canvas` - HTML5のCanvas APIのメソッドの型が定義されています。
- `purescript-refs` - **大域的な変更可能領域への参照**を扱うための副作用を提供しています。

この章のソースコードは、それぞれに`main`メソッドが定義されている複数のモ​​ジュールへと分割されています。この章の節の内容はそれぞれ異なるファイルで実装されており、それぞれの節で対応するファイルの`main`メソッドを実行できるように、Gruntビルドターゲットを変更することで`Main`モジュールが変更できるようになっています。

HTMLファイル `html/index.html`には、各例で使用される単一の` canvas`要素、およびコンパイルされたPureScriptコードを読み込む`script`要素が含まれています。各節のコードをテストするには、ブラウザでこのHTMLファイルを開いてください。

## 単純な図形

`Rectangle.purs`ファイルにはキャンバスの中心に青い四角形をひとつ描画するという簡単な例が含まれています。このモジュールは、`Control.Monad.Eff`モジュールと、Canvas APIを扱うための`Eff`モナドのアクションが定義されている`Graphics.Canvas`モジュールをインポートします。

他のモジュールでも同様ですが、`main`アクションは最初に` getCanvasElementById`アクションを使ってCanvasオブジェクトへの参照を取得しています。また、`getContext2D`アクションを使ってキャンバスの2Dレンダリングコンテキストを参照しています。

```haskell
main = do
  canvas <- getCanvasElementById "canvas"
  ctx <- getContext2D canvas
```

これらのアクションの型は `psci`を使うかドキュメントを見ると確認できます。

```haskell
getCanvasElementById :: forall eff. String -> Eff (canvas :: Canvas | eff) CanvasElement

getContext2D :: forall eff. CanvasElement -> Eff (canvas :: Canvas | eff) Context2D
```

`CanvasElement`と`Context2D`は`Graphics.Canvas`モジュールで定義されている型です。このモジュールでは、モジュール内のすべてのアクションで使用されている`Canvas`作用も定義されています。

グラフィックスコンテキスト`ctx`は、キャンバスの状態を管理し、プリミティブな図形を描画したり、スタイルや色を設定したり、座標変換を適用するためのメソッドを提供しています。

`ctx`の取得に続けて、`setFillStyle`アクションを使って塗りのスタイルを青一色の塗りつぶしに設定しています。

```haskell
  setFillStyle "#0000FF" ctx
```

`setFillStyle`アクションがグラフィックスコンテキストを引数として取っていることに注意してください。これは`Graphics.Canvas`で共通のパターンです。

最後に、`fillPath`アクションを使用して矩形を塗りつぶしています。`fillPath`は次のような型を持っています。

```haskell
fillPath :: forall eff a. Context2D -> 
                          Eff (canvas :: Canvas | eff) a -> 
                          Eff (canvas :: Canvas | eff) a
```

`fillPath`はグラフィックスコンテキストとレンダリングするパスを構築する別のアクションを引数にとります。パスは`rect`アクションを使うと構築することができます。`rect`はグラフィックスコンテキストと矩形の位置及びサイズを格納するレコードを引数にとります。

```haskell
  fillPath ctx $ rect ctx
    { x: 250
    , y: 250
    , w: 100
    , h: 100
    }
```

この長方形のコード例をビルドしましょう。

```text
$ grunt rectangle
```

それでは`html/index.html`ファイルを開き、このコードによってキャンバスの中央に青い四角形が描画されていることを確認してみましょう。

## 行多相を利用する

パスを描画する方法は他にもあります。`arc`関数は円弧を描画します。`moveTo`関数、 `lineTo`関数、`closePath`関数は細かい線分を組み合わせることでパスを描画します。

`Shapes.purs`ファイルでは長方形と円弧セグメント、三角形の、3つの図形を描画しています。

`rect`関数は引数としてレコードをとることを見てきました。実際には、長方形のプロパティは型同義語で定義されています。

```haskell
type Rectangle = { x :: Number
                 , y :: Number
                 , w :: Number
                 , h :: Number 
                 }
```

`x`と`y`プロパティは左上隅の位置を表しており、`w`と`h`のプロパティはそれぞれ幅と高さを表しています。

`arc`関数に以下のような型を持つレコードを渡して呼び出すと、円弧を描画することができます。

```haskell
type Arc = { x     :: Number
           , y     :: Number
           , r     :: Number
           , start :: Number
           , end   :: Number
           }
```

ここで、`x`と`y`プロパティは弧の中心、`r`は半径、`start`と`end`は弧の両端の角度を弧度法で表しています。

たとえば、次のコードは中心`(300、300)`、半径`50`の円弧を塗りつぶします。

```haskell
  fillPath ctx $ arc ctx
    { x      : 300
    , y      : 300
    , r      : 50
    , start  : Math.pi * 5 / 8
    , end    : Math.pi * 2
    }
```

`Number`型の`x`と`y`というプロパティが`Rectangle`レコード型と`Arc`レコード型の両方に含まれていることに注意してください。どちらの場合でもこの組は点を表しています。これは、いずれのレコード型にも適用できる、行多相な関数を書くことができることを意味します。

たとえば、 `Shapes`モジュールでは`x`と`y`のプロパティを変更し図形を並行移動する`translate`関数を定義されています。

```haskell
translate :: forall r. Number -> Number ->
              { x :: Number, y :: Number | r } ->
              { x :: Number, y :: Number | r }
translate dx dy shape = shape
  { x = shape.x + dx
  , y = shape.y + dy
  }
```

この行多相型に注目してください。これは`triangle`が`x`と`y`というプロパティと、**それに加えて他の任意のプロパティ**を持ったどんなレコードでも受け入れるということを言っています。`x`フィールドと`y`フィールドは更新されますが、残りのフィールドは変更されません。

これは**レコード更新構文**の例です。`shape { ... }`という式は、`shape`を元にして、括弧の中で指定されたように値が更新されたフィールドを持つ新たなレコードを作ります。波括弧の中の式はレコードリテラルのようなコロンではなく、等号でラベルと式を区切って書くことに意してください。

`Shapes`の例からわかるように、`translate`関数は`Rectangle`レコードと`Arc`レコード双方に対して使うことができます。

`Shape`の例で描画される3つめの型は線分ごとのパスです。対応するコードは次のようになります。

```haskell
  setFillStyle "#FF0000" ctx

  fillPath ctx $ do
    moveTo ctx 300 260
    lineTo ctx 260 340
    lineTo ctx 340 340
    closePath ctx
```

ここでは3つの関数が使われています。

-  `moveTo`はパスの現在位置を指定された座標へ移動させます。
-  `lineTo`は現在の位置と指定された座標の間に線分を描画し、現在の位置を更新します。
-  `closePath`は開始位置と現在位置を結ぶ線分を描画し、パスを閉じます。

このコード片を実行すると、二等辺三角形を塗りつぶされます。

`shapes`ターゲットを使ってこの例をビルドしましょう。

```text
$ grunt shapes
```

そしてもう一度`html/index.html`を開き、結果を確認して下さい。キャンバスに３つの異なる型が描画されるはずです。

> ## 演習 {-}
> 
> 1. (簡単) これまでの例のそれぞれについて、`strokePath`関数や`setStrokeStyle`関数を使ってみましょう。
> 
> 1. (簡単) 関数の引数の内部でdo記法ブロックを使うと、`fillPath`関数と`strokePath`関数で共通のスタイルを持つ複雑なパスを描画することができます。同じ`fillPath`呼び出しで隣り合った２つの矩形を描画するように、`Rectangle`のコード例を変更してみてください。線分と円弧を組み合わせてを、円の扇形を描画してみてください。
> 
> 1. (やや難しい) 次のような２次元の点を表すレコードが与えられたとします。
> 
>     ```haskell
>     type Point = { x :: Number, y :: Number }
>     ```
> 
>     多数の点からなる閉じたパスを描く関数`renderPath`書いてください。
> 
>     ```haskell
>     renderPath :: forall eff. Context2D -> [Point] -> 
>                                            Eff (canvas :: Canvas | eff) Context2D
>     ```
> 
>     次のような関数を考えます。
> 
>     ```haskell
>     f :: Number -> Point
>     ```
> 
>     この関数は引数として`1`から`0`の間の`Number`をとり、`Point`を返します。`renderPath`関数を利用して関数`f`のグラフを描くアクションを書いてください。そのアクションは有限個の点を`f`からサンプリングすることによって近似しなければなりません。
> 
>     関数`f`を変更し、異なるパスが描画されることを確かめてください。

## 無作為に円を描く

`Random.purs`ファイルには2種類の異なる副作用が混在した`Eff`モナドを使う例が含まれています。この例では無作為に生成された円をキャンバスに100個描画します。

`main`アクションはこれまでのようにグラフィックスコンテキストへの参照を取得し、ストロークと塗りつぶしスタイルを設定します。

```haskell
  setFillStyle "#FF0000" ctx
  setStrokeStyle "#000000" ctx
```

次のコードでは`forE`アクションを使って`0`から`100`までの整数について繰り返しをしています。

```haskell
  forE 1 100 $ \_ -> do
```

それぞれの繰り返しでは、do記法ブロックは3つの乱数を生成することから始まっています。

```haskell
    x <- random
    y <- random
    r <- random
```

これらの数は`0`から`1`の間に無作為に分布しています。これらはそれぞれ`x`座標、`y`座標、半径`r`を表しています。

次のコードでこれらの変数に基づいて`Arc`を作成します。

```haskell
    let path = arc ctx
         { x     : x * 600
         , y     : y * 600
         , r     : r * 50
         , start : 0
         , end   : Math.pi * 2
         }
```

そして最後に、現在のスタイルに従って円弧の塗りつぶしと線描が行われます。

```haskell
    fillPath ctx path
    strokePath ctx path

    return unit
```

 `forE`に渡された関数が正しい型を持つようにするため、最後の行は必要であることに注意してください。

Gruntfileの`random`ターゲットを使用して、この例をビルドします。

```text
$ grunt random
```

`html/index.html`を開いて、結果を確認してみましょう。

## 座標変換

キャンバスは簡単な図形を描画するだけのものではありません。キャンバスは変換行列を扱うことができ、図形は描画の前に形状を変形してから描画されます。図形は平行移動、回転、拡大縮小、および斜め変形することができます。

`purescript-canvas`ライブラリではこれらの変換を以下の関数で提供しています。

```haskell
translate :: forall eff. TranslateTransform -> Context2D
                                            -> Eff (canvas :: Canvas | eff) Context2D
rotate    :: forall eff. Number             -> Context2D
                                            -> Eff (canvas :: Canvas | eff) Context2D
scale     :: forall eff. ScaleTransform     -> Context2D
                                            -> Eff (canvas :: Canvas | eff) Context2D
transform :: forall eff. Transform          -> Context2D
                                            -> Eff (canvas :: Canvas | eff) Context2D
```

`translate`アクションは`TranslateTransform`レコードのプロパティで指定した大きさだけ平行移動を行います。

`rotate`アクションは最初の引数で指定されたラジアンの値に応じて原点を中心とした回転を行います。

`scale`アクションは原点を中心として拡大縮小します。`ScaleTransform`レコードは`X`軸と`y`軸に沿った拡大率を指定するのに使います。

最後の`transform`はこの４つのうちで最も一般的なアクションです。このアクションは行列に従ってアフィン変換を行います。

これらのアクションが呼び出された後に描画される図形は、自動的に適切な座標変換が適用されます。

実際には、これらの関数のそれぞれの作用は、コンテキストの現在の変換行列に対して変換行列を**右から乗算**していきます。つまり、もしある作用の変換をしていくと、その作用は実際には逆順に適用されていきます。次のような座標変換のアクションを考えてみましょう。

```haskell
transformations ctx = do
  translate { translateX: 10, translateY } ctx
  scale { scaleX: 2, scaleY: 2 } ctx
  rotate (Math.pi / 2) ctx
  
  renderScene
```

このアクションの作用では、まずシーンが回転され、それから拡大縮小され、最後に平行移動されます。　　　　　

## コンテキストの保存

一般的な使い方としては、変換を適用してシーンの一部をレンダリングし、それからその変換を元に戻します。

Canvas APIにはキャンバスの状態の**スタック**を操作する`save`と`restore`メソッドが備わっています。`purescript-canvas`ではこの機能を次のような関数でラップしています。

```haskell
save    :: forall eff. Context2D -> Eff (canvas :: Canvas | eff) Context2D
restore :: forall eff. Context2D -> Eff (canvas :: Canvas | eff) Context2D
```

`save`アクションは現在のコンテキストの状態(現在の変換行列や描画スタイル)をスタックにプッシュし、`restore`アクションはスタックの一番上の状態をポップし、コンテキストの状態を復元します。

これらのアクションにより、現在の状態を保存し、いろいろなスタイルや変換を適用し、プリミティブを描画し、最後に元の変換と状態を復元することが可能になります。例えば、次の関数はいくつかのキャンバスアクションを実行しますが、その前に回転を適用し、そのあとに変換を復元します。

```haskell
rotated ctx render = do
  save ctx
  rotate Math.pi ctx
  render
  restore ctx
```

こういったよくある使いかたの高階関数を利用した抽象化として、`purescript-canvas`ライブラリでは元のコンテキスト状態を維持しながらいくつかのキャンバスアクションを実行する`withContext`関数が提供されています。

```haskell
withContext :: forall eff a. Context2D -> 
                             Eff (canvas :: Canvas | eff) a ->
                             Eff (canvas :: Canvas | eff) a          
```

`withContext`を使うと、先ほどの`rotated`関数を次のように書き換えることができます。

```haskell
rotated ctx render = withContext ctx $ do
  rotate Math.pi ctx
  render
```

## 大域的な変更可能状態

この節では`purescript-refs`パッケージを使って`Eff`モナドの別の作用について実演してみます。

`Control.Monad.Eff.Ref`モジュールでは大域的に変更可能な参照のための型構築子、および関連する作用を提供します。

```text
> :i Control.Monad.Eff.Ref

> :k RefVal
* -> *

> :k Ref
!
```

型`RefVal a`の値は型`a`値を保持する変更可能な領域への参照で、前の章で見た`STRef h a`によく似ています。その違いは、`ST`作用は`runST`を用いて除去することができますが、`Ref`作用はハンドラを提供しないということです。`ST`は安全に局所的な状態変更を追跡するために使用されますが、`Ref`は大域的な状態変更を追跡するために使用されます。そのため、`Ref`は慎重に使用する必要があります。

`Refs.purs`ファイルには`canvas`要素上のマウスクリックを追跡するのに `Ref`作用を使用する例が含まれています。

このコー​​ドでは最初に`newRef`アクションを使って値`0`で初期化された領域への新しい参照を作成しています。

```haskell
  clickCount <- newRef 0
```

クリックイベントハンドラの内部では、`modifyRef`アクションを使用してクリック数を更新しています。

```haskell
    modifyRef clickCount (\count -> count + 1)
```

`readRef`アクションは新しいクリック数を読み取るために使われています。

```haskell
    count <- readRef clickCount
```

`render`関数では、クリック数に応じて変換を矩形に適用しています。

```haskell
    withContext ctx $ do
      let scaleX = Math.sin (count * Math.pi / 4) + 1.5
      let scaleY = Math.sin (count * Math.pi / 6) + 1.5
      
      translate { translateX:  300, translateY:  300 } ctx
      rotate (count * Math.pi / 18) ctx
      scale { scaleX: scaleX, scaleY: scaleY } ctx
      translate { translateX: -100, translateY: -100 } ctx

      fillPath ctx $ rect ctx
        { x: 0
        , y: 0
        , w: 200
        , h: 200
        }
```

このアクションでは元の変換を維持するために`withContext`を使用しており、それから続く変換を順に適用しています(変換が下から上に適用されることを思い出してください)。

- 中心が原点に来るように、矩形を`(-100, -100)`平行移動します。
- 矩形を原点を中心に拡大縮小します。
- 矩形を原点を中心に`10`度の倍数だけ回転します。
- 中心がキャンバスの中心に位置するように長方形を`(300、300)`だけ平行移動します。

このコード例をビルドしてみましょう。

```text
$ grunt refs
```

`html/index.html`ファイルを開いてみましょう。何度かキャンバスをクリックすると、キャンバスの中心の周りを回転する緑の四角形が表示されるはずです。

> ## 演習 {-}
> 
> 1. (簡単) パスの線描と塗りつぶしを同時に行う高階関数を書いてください。その関数を使用して `Random.purs`例を書きなおしてください。
> 
> 1. (やや難しい) `Random`作用と`DOM`作用を使用して、マウスがクリックされたときにキャンバスに無作為な位置、色、半径の円を描画するアプリケーションを作成してください。
> 
> 1. (やや難しい) シーンを指定された座標を中心に回転する関数を書いてください。**ヒント**：最初にシーンを 原点まで平行移動しましょう。

## L-Systems

この章の最後の例として、`purescript-canvas`パッケージを使用して**L-systems**(Lindenmayer systems)を描画する関数を記述します。

L-Systemsは**アルファベット**、つまり初期状態となるアルファベットの文字列と、**生成規則**の集合で定義されています。各生成規則は、アルファベットの文字をとり、それを置き換える文字の配列を返します。この処理は文字の初期配列から始まり、複数回繰り返されます。

もしアルファベットの各文字がキャンバス上で実行される命令と対応付けられていれば、その指示に順番に従うことでL-Systemsを描画することができます。

たとえば、アルファベットが文字 `L` (左回転)、 `R`(右回転)、`F`(前進)で構成されていたとします。また、次のような生成規則を定義します。

```text
L -> L
R -> R
F -> FLFRRFLF
```

配列 "FRRFRRFRR" から始めて処理を繰り返すと、次のような経過を辿ります。

```text
FRRFRRFRR
FLFRRFLFRRFLFRRFLFRRFLFRRFLFRR
FLFRRFLFLFLFRRFLFRRFLFRRFLFLFLFRRFLFRRFLFRRFLF...
```

この命令群に対応する線分パスをプロットすると、**コッホ曲線**と呼ばれる曲線に近似します。反復回数を増やすと、曲線の解像度が増加していきます。

それでは型と関数の言語へとこれを翻訳してみましょう。

アルファベットの選択肢は型の選択肢によって表すことができます。今回の例では、以下のような型で定義することができます。

```haskell
data Alphabet = L | R | F
```

このデータ型では、アルファベットの各文字ごとに１つずつデータ構築子が定義が定義されています。

文字の初期配列はどのように表したらいいでしょうか。単なるアルファベットの配列でいいでしょう。これを`Sentence`と呼ぶことにします。

```haskell
type Sentence = [Alphabet]

initial :: Sentence
initial = [F, R, R, F, R, R, F, R, R]
```

生成規則は`Alphabet`から`Sentence`への関数として表すことができます。

```haskell
productions :: Alphabet -> Sentence
productions L = [L]
productions R = [R]
productions F = [F, L, F, R, R, F, L, F]
```

これはまさに上記の仕様をそのまま書き写したものです。

これで、この形式の仕様を受け取りキャンバスに描画する関数`lsystem`を実装することができます。`lsystem`はどのような型を持っているべきでしょうか。この関数は初期状態`initial`と生成規則`productions`のような値だけでなく、アルファベットの文字をキャンバスに描画する関数を引数に取る必要があります。

`lsystem`の型の最初の大まかな設計としては、次のようになるかもしれません。

```haskell
forall eff. Sentence ->
            (Alphabet -> Sentence) ->
            (Alphabet -> Eff (canvas :: Canvas | eff) Unit) ->
            Number ->
            Eff (canvas :: Canvas | eff) Unit
```

最初の2つの引数の型は、値`initial`と`productions`に対応しています。

3番目の引数は、アルファベットの文字を取り、キャンバス上のいくつかのアクションを実行することによって**翻訳**する関数を表します。この例では、文字 `L`は左回転、文字 `R`で右回転、文字` F`は前進を意味します。

最後の引数は、実行したい生成規則の繰り返し回数を表す数です。

最初に気づくことは、現在の`lsystem`関数は`Alphabet`型だけで機能しますが、どんなアルファベットについても機能すべきですから、この型はもっと一般化されるべきです。それでは、量子化された型変数`a`について、`Alphabet`と`Sentence`を`a`で置き換えましょう。

```haskell
forall a eff. [a] ->
              (a -> [a]) ->
              (a -> Eff (canvas :: Canvas | eff) Unit) ->
              Number ->
              Eff (canvas :: Canvas | eff) Unit
```

次に気付くこととしては、「左回転」と「右回転」のような命令を実装するためには、いくつかの状態を管理する必要があります。具体的に言えば、その時点でパスが向いている方向を状態として持たなければなりません。計算を通じて状態を関数に渡すように変更する必要があります。ここでも`lsystem`関数は状態がどんな型でも動作しなければなりませんから、型変数`s`を使用してそれを表しています。

型`s`を追加する必要があるのは3箇所で、次のようになります。

```haskell
forall a s eff. [a] ->
                (a -> [a]) ->
                (s -> a -> Eff (canvas :: Canvas | eff) s) ->
                Number ->
                s -> 
                Eff (canvas :: Canvas | eff) s
```

まず追加の引数の型として`lsystem`に型`s`が追加されています。この引数はL-Systemの初期状態を表しています。

型`s`は引数にも現れますが、翻訳関数(`lsystem`の第3引数)の返り値の型としても現れます。翻訳関数は今のところ、引数としてL-Systemの現在の状態を受け取り、返り値として更新された新しい状態を返します。

この例の場合では、次のような型を使って状態を表す型を定義することができます。

```haskell
type State =
  { x :: Number
  , y :: Number
  , theta :: Number
  }
```

プロパティ`x`と`y`はパスの現在の位置を表しており、プロパティ`theta`は現在の向きを表しており、ラジアンで表された水平線に対するパスの角度です。

システムの初期状態としては次のようなものが考えられます。

```haskell
initialState :: State
initialState = { x: 120, y: 200, theta: 0 }
```

それでは、`lsystem`関数を実装してみます。定義はとても単純であることがわかるでしょう。

`lsystem`は第４引数の値(型`Number`)に応じて再帰するのが良さそうです。再帰の各ステップでは、生成規則に従って状態が更新され、現在の文が変化していきます。このことを念頭に置きつつ、まずは関数の引数の名前を導入して、補助関数に処理を移譲することから始めましょう。

```haskell
lsystem :: forall a s eff. [a] ->
                           (a -> [a]) ->
                           (s -> a -> Eff (canvas :: Canvas | eff) s) ->
                           Number ->
                           s -> 
                           Eff (canvas :: Canvas | eff) s
lsystem init prod interpret n state = go init n
  where
```

`go`関数は第2引数に応じて再帰することで動きます。`n`がゼロであるときと`n`がゼロでないときの2つの場合で分岐します。

`n`がゼロの場合では再帰は完了し、解釈関数に応じて現在の文を解釈します。ここでは引数として与えられている型`[a]`の文、型`s`の状態、型`s -> a -> Eff (canvas :: Canvas | eff) s`の関数を参照することができます。これらの引数の型を考えると、以前定義した`foldM`の呼び出しにちょうど対応していることがわかります。`foldM`は`purescript-control`パッケージでも定義されています。

```haskell
  go s 0 = foldM interpret state s
```

ゼロでない場合ではどうでしょうか。その場合は、単に生成規則を現在の文のそれぞれの文字に適用して、その結果を連結し、そしてこの処理を再帰します。

```haskell
  go s n = go (concatMap prod s) (n - 1)
```

これだけです！`foldM`や`concatMap`のような高階関数を使うと、このようにアイデアを簡潔に表現することができるのです。

しかし、まだ完全に終わったわけではありません。ここで与えた型は、実際はまだ特殊化されすぎています。この定義ではキャンバスの操作が実装のどこにも使われていないことに注目してください。それに、まったく`Eff`モナドの構造を利用していません。実際には、この関数は**どんな**モナド`m`についても動作するのです！

この章に添付されたソースコードで定義されている、`lsystem`のもっと一般的な型は次のようになっています。

```haskell
lsystem :: forall a m s. (Monad m) =>
                         [a] ->
                         (a -> [a]) ->
                         (s -> a -> m s) ->
                         Number ->
                         s -> 
                         m s
```

この型が言っているのは、この翻訳関数はモナド`m`で追跡される任意の副作用をまったく自由に持つことができる、ということだと理解することができます。キャンバスに描画したり、またはコンソールに情報を出力するかもしれませんし、失敗や複数の戻り値に対応しているかもしれません。こういった様々な型の副作用を使ったL-Systemを記述してみることを読者にお勧めします。

この関数は実装からデータを分離することの威力を示す良い例となっています。この手法の利点は、複数の異なる方法でデータを解釈する自由が得られることです。`lsystem`は２つの小さな関数へと分解することができるかもしれません。ひとつめは`concatMap`の適用の繰り返しを使って文を構築するもので、ふたつめは`foldM`を使って文を翻訳するものです。これは読者の演習として残しておきます。

それでは翻訳関数を実装して、この章の例を完成させましょう​​。`lsystem`の型は型シグネチャが言っているのは、翻訳関数の型は、何らかの型`a`と`s`、型構築子`m`について、 `s -> a -> m s` でなければならないということです。今回は`a`を`Alphabet`、 `s`を`State`、モナド`m`を`Eff (canvas :: Canvas)`というように選びたいということがわかっています。これにより次のような型になります。

```haskell
interpret :: State -> Alphabet -> Eff (canvas :: Canvas) State
```

この関数を実装するには、`Alphabet`型の3つのデータ構築子それぞれについて処理する必要があります。文字`L`(左回転)と`R`(右回転)の解釈では、`theta`を適切な角度へ変更するように状態を更新するだけです。

```haskell
interpret state L = return $ state { theta = state.theta - Math.pi / 3 }
interpret state R = return $ state { theta = state.theta + Math.pi / 3 }
```

文字`F`(前進)を解釈するには、パスの新しい位置を計算し、線分を描画し、状態を次のように更新します。

```haskell
interpret state F = do
  let x' = state.x + Math.cos state.theta * 1.5
      y' = state.y + Math.sin state.theta * 1.5
  moveTo ctx state.x state.y
  lineTo ctx x' y'
  return { x: x', y: y', theta: state.theta }
```

この章のソースコードでは、名前`ctx`を参照できるようにするために、`interpret`関数は`main`関数内で`let`束縛を使用して定義されていることに注意してください。`State`型がコンテキストを持つように変更することは可能でしょうが、それはこのシステムの状態の変化部分ではないので不適切でしょう。

このL-Systemsを描画するには、次のような`strokePath`アクションを使用するだけです。

```haskell
strokePath ctx $ lsystem initial productions interpret 5 initialState
```

`grunt lsystem`を使ってL-Systemをコンパイルし、`html/index.html`を開いてみましょう。キャンバスにコッホ曲線が描画されるのがわかると思います。

> ## 演習 {-}
> 
> 1. (簡単) `strokePath`の代わりに`fillPath`を使用するように、上のL-Systemsの例を変更してください。**ヒント**：`closePath`の呼び出しを含め、`moveTo` の呼び出しを`interpret`関数の外側に移動する必要があります。
> 
> 1. (簡単) 描画システムへの影響を理解するために、コード中の様々な数値の定数を変更してみてください。
> 
> 1. (やや難しい) `lsystem`関数を2つの小さな関数に分割してください。ひとつめは`concatMap`の適用の繰り返しを使用して最終的な結果を構築するもので、ふたつめは`foldM`を使用して結果を解釈するものでなくてはなりません。
> 
> 1. (やや難しい) `setShadowOffsetX`アクション、`setShadowOffsetY`アクション、`setShadowBlur`アクション、`setShadowColor`アクションを使い、塗りつぶされた図形にドロップシャドウを追加してください。**ヒント**：`psci`を使って、これらの関数の型を調べてみましょう。
> 
> 1. (やや難しい) 向きを変えるときの角度の大きさは今のところ一定(`pi/3`)です。その代わりに、`Alphabet`データ型の中に角度の大きさを追加して、生成規則によって角度を変更できるようにしてください。
> 
>     ```haskell
>     type Angle = Number
>     
>     data Alphabet = L Angle | R Angle | F Angle
>     ```
>     
>     生成規則でこの新しい情報を使うと、どんな面白い図形を作ることができるでしょうか。
>　
> 1. (難しい) `L`(60度左回転 )、`R`(60度右回転)、`F`(前進)、`M` (これも前進)という４つの文字からなるアルファベットでL-Systemが与えられたとします。
> 
>     このシステムの文の初期状態は、単一の文字`M`です。
> 
      このシステムの生成規則は次のように指定されています。
> 
>     ```text
>     L -> L
>     R -> R
>     F -> FLMLFRMRFRMRFLMLF
>     M -> MRFRMLFLMLFLMRFRM
>     ```
> 
>     このL-Systemを描画してください。**注意**：最後の文のサイズは反復回数に従って指数関数的に増大するので、生成規則の繰り返しの回数を削減することが必要になります。
> 
>     ここで、生成規則における `L`と`M `の間の対称性に注目してください。ふたつの「前進」命令は、次のようなアルファベット型を使用すると、 `Boolean`値を使って区別することができます。
> 
>     ```haskell
>     data Alphabet = L | R | F Boolean
>     ```
> 
>     このアルファベットの表現を使用して、もう一度このL-Systemを実装してください。
>     
> 1. (難しい) 翻訳関数で別のモナド`m`を使ってみましょう。`Trace`作用を利用してコンソール上にL-Systemを出力したり、`Random`作用を利用して状態の型に無作為の突然変異を適用したりしてみてください。

## まとめ

この章では、 `purescript-canvas`ライブラリを使用することにより、PureScriptからHTML5 Canvas APIを使う方法について学びました。マップや畳み込み、レコードと行多型、副作用を扱うための`Eff`モナドなど、これまで学んできた手法を利用した実用的な例について多く見ました。

この章の例では、高階関数の威力を示すとともに、**実装からデータを分離**も実演しました。これは例えば、代数データ型を使用すると、これらの概念を次のように拡張し、描画関数からシーンの表現を完全に分離できるようになります。

```haskell
data Scene = Rect Rectangle
           | Arc Arc
           | PiecewiseLinear [Point]
           | Transformed Transform Scene
           | Clipped Rectangle Scene
           | ...
```

この手法は`purescript-drawing`パッケージでも採用されており、描画前にさまざまな方法でデータとしてシーンを操作することができるという柔軟性をもたらしています。

次の章では、PureScriptの**外部関数インタフェース**(foreign function interface)を使って、既存のJavaScriptの関数をラップした`purescript-canvas`のようなライブラリを実装する方法について説明します。
