const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require('path');
const webpack = require('webpack');

module.exports = env => {

  return {
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.ts?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        }
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist'),
    },

    plugins: [
      new HtmlWebpackPlugin({
          title: 'our project', 
          template: 'example/example-fetch.html' }),
      new webpack.DefinePlugin({
            'METADATA_EXTENTION': JSON.stringify(env.METADATA_EXTENTION),
            'DATA_EXTENTION': JSON.stringify(env.DATA_EXTENTION),
            'MORE_VERBOSE': env.MORE_VERBOSE
        })
    ],

    devServer: {
      static: path.join(__dirname, "dist"),
      compress: true,
      port: 4000,
    },
  }
};