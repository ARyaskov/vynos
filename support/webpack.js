'use strict'

const path = require('path')
const webpack = require('webpack')

const CopyPlugin = require('copy-webpack-plugin')
const NodeExternalsPlugin = require('webpack-node-externals')

require('dotenv').config({ path: '.env' })
const NODE_ENV = process.env.NODE_ENV || 'development'

const DIST_PATH = 'dist'
const EXTERNALS_WHITELIST = /^(?!(require_optional|bindings|pg)).*$/

function outputFilename() {
  return '[name].js'
}

function resolve(filePath) {
  return path.resolve(__dirname, '..', ...filePath.split('/'))
}

function bundle (entry) {
  let config = {
    entry: entry,
    output: {
      filename: outputFilename(),
      path: resolve(DIST_PATH)
    },
    mode: 'development',
    devtool: 'source-map',
    externals: [NodeExternalsPlugin({whitelist: [EXTERNALS_WHITELIST]})],
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify(NODE_ENV) // This has effect on the react lib size
        },
        'global.XMLHttpRequest': global.XMLHttpRequest
      })
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader'
        },
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          enforce: 'pre',
          exclude: [/node_modules/]
        },
        {
          test: /\.s?css$/i,
          exclude: [/node_modules/],
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1,
                modules: true,
                camelCase: true,
                localIdentName: '[name]_[local]_[hash:base64:5]',
                minimize: false
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => ([
                  require('postcss-import')(),
                  require('postcss-nesting')(),
                  require('autoprefixer')({
                    browsers: ['last 2 versions', 'ie >= 9']
                  })
                ])
              }
            }
          ]
        },
        {
          test: /\.css$/i,
          exclude: [resolve('vynos'), resolve('harness')],
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1,
                minimize: true
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => ([
                  require('postcss-import')({
                    //If you are using postcss-import v8.2.0 & postcss-loader v1.0.0 or later, this is unnecessary.
                    //addDependencyTo: webpack // Must be first item in list
                  }),
                  require('postcss-nesting')(),  // Following CSS Nesting Module Level 3: http://tabatkins.github.io/specs/css-nesting/
                  require('autoprefixer')({
                    browsers: ['last 2 versions', 'ie >= 9'] //https://github.com/ai/browserslist
                  })
                ])
              }
            }
          ]
        },
        {
          test: /\.(eot|woff|woff2|svg|ttf|png)([\?]?.*)$/,
          loader: 'file-loader'
        }
      ]
    },
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      module: 'empty',
      dns: 'mock'
    }
  }

  switch (NODE_ENV) {
    case 'production':
      config.mode = 'production'
      config.plugins.push(new CopyPlugin([
        resolve('vynos/frame.html'),
        resolve('vynos/check.html')
      ]))
      break
    default:
      config.plugins.push(new webpack.HotModuleReplacementPlugin())
      config.plugins.push(new webpack.NamedModulesPlugin())
  }

  return config
}

module.exports.bundle = bundle
module.exports.resolve = resolve

module.exports.HARNESS = bundle({
  harness: resolve('harness/harness.ts')
})

module.exports.BACKGROUND = bundle({
  frame: resolve('vynos/frame.ts'),
  worker: resolve('vynos/worker.ts')
})

module.exports.EMBED = bundle({
  vynos: resolve('vynos/vynos.ts')
})
