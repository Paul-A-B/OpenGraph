const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/main.js",
  output: {
    filename: "app.js",
    publicPath: "/build/",
    path: path.resolve(__dirname, "public", "build"),
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, "public"),
    },
    compress: true,
    port: 9000,
    client: {
      overlay: true,
      progress: true,
    },
  },
};
