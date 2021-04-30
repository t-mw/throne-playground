const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
  mode: "production",
  entry: {
    index: "./js/index.js"
  },
  output: {
    path: dist,
    filename: "[name].js"
  },
  devServer: {
    contentBase: dist,
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ["style-loader", "css-loader"]
    }, {
      test: /\.ttf$/,
      use: ["file-loader"]
    }, {
      test: /\.throne$/,
      use: "raw-loader",
    }]
  },
  plugins: [
    new CopyPlugin([
      path.resolve(__dirname, "static")
    ]),
    new MonacoWebpackPlugin()
  ]
};
