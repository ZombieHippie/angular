/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import './init';
import {NestedModule, NestedService, ParentComp, SomeComp, SomeModule, SomeService} from '../src/module_fixtures';
import {SomeModuleNgFactory, SomeModuleUsingParentCompNgFactory, SomeModuleWithAnalyzePrecompileProviderNgFactory} from '../src/module_fixtures.ngfactory';
import {createComponent, createModule} from './util';

describe('AppModule', () => {
  it('should support providers', () => {
    var moduleRef = createModule(SomeModuleNgFactory);
    expect(moduleRef.instance instanceof SomeModule).toBe(true);
    expect(moduleRef.injector.get(SomeModule) instanceof SomeModule).toBe(true);
    expect(moduleRef.injector.get(SomeService) instanceof SomeService).toBe(true);
  });

  it('should support precompile components', () => {
    var moduleRef = createModule(SomeModuleNgFactory);
    var cf = moduleRef.componentFactoryResolver.resolveComponentFactory(SomeComp);
    expect(cf.componentType).toBe(SomeComp);
    var compRef = cf.create(moduleRef.injector);
    expect(compRef.instance instanceof SomeComp).toBe(true);
  });

  it('should support precompile via the ANALYZE_FOR_PRECOMPILE provider and function providers in components',
     () => {
       const moduleRef = createModule(SomeModuleWithAnalyzePrecompileProviderNgFactory);
       const cf = moduleRef.componentFactoryResolver.resolveComponentFactory(SomeComp);
       expect(cf.componentType).toBe(SomeComp);
       // check that the function call that created the provider for ANALYZE_FOR_PRECOMPILE worked.
       expect(moduleRef.instance.providedValue).toEqual([{a: 'b', component: SomeComp}]);
     });

  it('should support module directives and pipes', () => {
    var compFixture = createComponent(SomeComp, SomeModuleNgFactory);
    compFixture.detectChanges();

    var debugElement = compFixture.debugElement;
    expect(debugElement.children[0].properties['title']).toBe('transformed someValue');
  });

  it('should support module directives and pipes on nested components', () => {
    var compFixture = createComponent(ParentComp, SomeModuleUsingParentCompNgFactory);
    compFixture.detectChanges();

    var debugElement = compFixture.debugElement;
    debugElement = debugElement.children[0];
    expect(debugElement.children[0].properties['title']).toBe('transformed someValue');
  });

  it('should support child moduless', () => {
    var moduleRef = createModule(SomeModuleNgFactory);
    expect(moduleRef.instance instanceof SomeModule).toBe(true);
    expect(moduleRef.injector.get(NestedModule) instanceof NestedModule).toBe(true);
    expect(moduleRef.injector.get(NestedService) instanceof NestedService).toBe(true);
  });

});
