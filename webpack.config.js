var path = require('path');
var webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = env => {
    console.log(`GENERATING HIVE XHR INTERCEPTOR WITH PARAMTERS: METADATA_EXTENTION ${env.METADATA_EXTENTION} DATA_EXTENTION ${env.DATA_EXTENTION}`)
    return {
        entry: './src/hivejs.interceptor.ts',
        output:{
            path: path.resolve(__dirname, 'dist'),
            filename: 'hivejs.interceptor.js'
        },
        module: {
            rules: [
                {
                    test: /\.ts$/, use: 'ts-loader'
                }
            ]
        },
        plugins: [
            // Uncomment this to uglyfy the library
            // new UglifyJSPlugin({
            //     uglifyOptions: {
            //         mangle: false
            //     },
            //     output: {
            //         comments: true,
            //         beautify: true
            //       },
            // }),
            new webpack.DefinePlugin({
                'METADATA_EXTENTION': JSON.stringify(env.METADATA_EXTENTION),
                'DATA_EXTENTION': JSON.stringify(env.DATA_EXTENTION),
                'MORE_VERBOSE': env.MORE_VERBOSE
            })
        ]
    }
}