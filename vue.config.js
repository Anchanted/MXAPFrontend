// vue.config.js
const path = require("path")
const webpack = require('webpack')
const fs = require('fs')
// const htmlWebpackPlugin = require('html-webpack-plugin')

function resolve (dir) {
  return path.join(__dirname, './', dir)
}

module.exports = {
  chainWebpack: config => {
    // 为src下文件配别名，不使用相对路径
    config.resolve.alias
      .set("@", resolve("src"))
      .set('assets', resolve('src/assets'))
      .set('components', resolve('src/components'))
      .set('views', resolve('src/views'))
      .set('api', resolve('src/api'))
      .set('icons', resolve('src/icons'))
      .set('router', resolve('src/router'))
      .set('store', resolve('src/store'))
      .set('utils', resolve('src/utils'))
      .set('style', resolve('src/style'))
      .set('locales', resolve('src/locales'))
      .set('plugins', resolve('src/plugins'))
  },
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        Popper: ['popper.js', 'default']
      }),
      // new htmlWebpackPlugin({
      //   filename: "index.html",
      //   template: "index.html",
      //   title: "mxapfrontend",
      //   favicon: "favicon.ico",
      //   inject: true
      // })
    ]
  },
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: true
    }
  },
  publicPath: process.env.NODE_ENV === "production" ? "/m/" : "/",
  // publicPath: "/",
  // assetsPublicPath: process.env.NODE_ENV === 'production' ? "/xap/" : "/",
  outputDir: "dist", // 打包的目录
  lintOnSave: false, // 在保存时校验格式
  productionSourceMap: false, // 生产环境是否生成 SourceMap
  devServer: {
    open: false, // 启动服务后是否打开浏览器
    host: "0.0.0.0",
    port: 8080, // 服务端口
    https: false,
    // https: {
    //   key: fs.readFileSync('src/cert/server.key'),
    //   cert: fs.readFileSync('src/cert/server.crt'),
    //   ca: fs.readFileSync('src/cert/server.crt'),
    // },
    // https: true,
    hotOnly: false,
    proxy: {                
      //名字可以自定义，这里我用的是api                
      '/api': {                  
        target: 'http://localhost:8888/',//设置你调用的接口域名和端口号 别忘了加http                  
        changeOrigin: true,//这里设置是否跨域        
        ws: true, 
        // secure: false,         
        pathRewrite: {                    
          '^/api': ''                  
        }                
      }            
    },
    before: app => {}
  }
}
