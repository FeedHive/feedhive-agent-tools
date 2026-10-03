import * as webpack from 'webpack';
import { babel, typescript } from './loaders';

const exclude = /node_modules/;

export const js: webpack.RuleSetRule = {
  test: /.jsx?$/,
  use: babel,
  exclude,
};

export const ts: webpack.RuleSetRule = {
  test: /.tsx?$/,
  use: typescript,
  exclude,
};

const rules: webpack.RuleSetRule[] = [js, ts];

export default rules;
