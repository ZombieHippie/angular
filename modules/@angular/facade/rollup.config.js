
export default {
  entry: '../../../dist/packages-dist/facade/esm/facade.js',
  dest: '../../../dist/packages-dist/facade/esm/facade.umd.js',
  sourceMap: true,
  format: 'umd',
  moduleName: 'ng.facade',
  globals: {
    'rxjs/Subject': 'Rx',
    'rxjs/observable/PromiseObservable': 'Rx', // this is wrong, but this stuff has changed in rxjs b.6 so we need to fix it when we update.
    'rxjs/operator/toPromise': 'Rx.Observable.prototype',
    'rxjs/Observable': 'Rx'
  },
  plugins: [
//    nodeResolve({ jsnext: true, main: true }),
  ]
}
