const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/graph.js",
  output: {
    filename: "app.js",
    publicPath: "/assets/",
    path: path.resolve(__dirname, "public", "assets"),
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
