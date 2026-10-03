import * as webpack from 'webpack';

const getPlugins = (nodeEnv: 'development' | 'production'): webpack.WebpackPluginInstance[] => [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(nodeEnv),
  }),
];

export default getPlugins;
