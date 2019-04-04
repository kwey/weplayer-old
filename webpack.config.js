const path = require('path')
const webpack = require('webpack')
const modules = require('./webpack.module')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const pkg = require('./package.json')
const git = require('git-rev-sync')

module.exports = (env = {}) => {
    let tool = ''
    let mode = 'production'
    if (env.dev) {
        tool = 'cheap-module-eval-source-map'
        mode = 'development'
    }
    const config = {
        context: path.resolve(__dirname, 'src'),
        mode: mode,
        devtool: tool,
        stats: {
            modules: false
        },
        entry: { weplayer: './index.ts' },
        output: {
            path: path.resolve(__dirname, 'dist/'),
            filename: '[name].js',
            library: 'WEPlayer',
            libraryTarget: 'umd',
            umdNamedDefine: true
        },
        module: modules,
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        plugins: [
            new webpack.DefinePlugin({
                _METADATA_: JSON.stringify({
                    name: pkg.name,
                    version: pkg.version,
                    hash: git.short(),
                    branch: git.branch(),
                    lastModefied: new Date().toISOString()
                })
            })
        ],
        optimization: {
            minimizer: []
        },
        watchOptions: {
            ignored: /node_modules/
        },
        node: false,
        devServer: {
            compress: true,
            overlay: true,
            openPage: './demo/index.html',
            disableHostCheck: true,
            port: 8088,
            publicPath: '/demo/',
            headers: {
                'X-Custom-Header': 'yes',
                'Access-Control-Allow-Origin': '*'
            }
        }
    }
    if (!env.dev) {
        if (env.gcc) {
            // config.plugins.push(new BundleAnalyzerPlugin())
            config.optimization.minimizer.push(
                new UglifyJsPlugin({
                    test: /\.js($|\?)/i,
                    uglifyOptions: {
                        compress: {
                            warnings: false,
                            drop_debugger: true,
                            drop_console: true
                        },
                        output: {
                            beautify: false,
                            comments: false
                        },
                        toplevel: true,
                        nameCache: null,
                        keep_fnames: false
                    }
                })
            )
        }
    }

    return config
}
