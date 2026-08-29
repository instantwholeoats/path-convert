# PATHコンバータ

## 何の役に立つのか
SMBで共有されている共有フォルダを扱う際、Windowsでは、

```
\\server\mountPoint\path\to\file
```

とファイルパスが表現されます。
この形式のパスをMacで読める形に直したり、直接ファイルを開いたりできます。

## 使い方

### Windows形式のパスをMac形式に直す時

一番上のWindows pathと記載されているテキストボックスにパスを貼り付けます。
openボタンを押すと恐らく開くことができます。

### Mac形式のパスをWindows形式に直す時

適当なテキストボックスにファイルをドラッグします。

## 開発

Node.js 22.12以上が必要です。

```sh
npm ci
npm test
npm run pack:dir
```

画面側ではNode.js APIを利用できないよう隔離し、ファイルを開く処理は
`/Volumes` 以下のパスだけをElectronの安全なAPIへ渡します。
