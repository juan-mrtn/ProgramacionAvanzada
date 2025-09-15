const path = require('path'); // para manejar las rutas de los archivos
const HtmlWebpackPlugin = require('html-webpack-plugin'); // para generar el archivo html

module.exports = {
  entry: './index.js', // punto de entrada de nuestro proyecto
  output: {
    path: path.resolve(__dirname, 'dist'), // directorio de salida de nuestro proyecto
    filename: 'main.js', // nombre del archivo de salida
    publicPath: '/', // ruta de nuestro proyecto
    clean: true,
  },
  resolve: {
    extensions: ['.js'], // extensiones de los archivos que vamos a usar
  },
  module: {
    rules: [
      {
        test: /\.js$/, // test para los archivos js
        exclude: /node_modules/, // excluimos la carpeta node_modules
        use: {
          loader: 'babel-loader', // loader para los archivos js
          options: {
            presets: ['@babel/preset-env'] // presets para los archivos js
          }
        }
      },
      {
        test: /\.css$/, // test para los archivos css
        use: ['style-loader', 'css-loader'] // loaders para los archivos css
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true, // inject para los archivos html
      template: './public/index.html', // template para los archivos html
      filename: './index.html', // nombre del archivo de salida
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'), // directorio de salida de nuestro proyecto
    },
    compress: true, // compresión de los archivos
    port: 3000, // puerto de nuestro proyecto
    open: true, // abrir el navegador
    historyApiFallback: true, // fallback para las rutas
  }
}
