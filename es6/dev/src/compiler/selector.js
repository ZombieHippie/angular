import { Map, ListWrapper } from 'angular2/src/facade/collection';
import { isPresent, isBlank, RegExpWrapper, RegExpMatcherWrapper, StringWrapper } from 'angular2/src/facade/lang';
import { BaseException } from 'angular2/src/facade/exceptions';
const _EMPTY_ATTR_VALUE = '';
// TODO: Can't use `const` here as
// in Dart this is not transpiled into `final` yet...
var _SELECTOR_REGEXP = RegExpWrapper.create('(\\:not\\()|' +
    '([-\\w]+)|' +
    '(?:\\.([-\\w]+))|' +
    '(?:\\[([-\\w*]+)(?:=([^\\]]*))?\\])|' +
    '(\\))|' +
    '(\\s*,\\s*)'); // ","
/**
 * A css selector contains an element name,
 * css classes and attribute/value pairs with the purpose
 * of selecting subsets out of them.
 */
export class CssSelector {
    constructor() {
        this.element = null;
        this.classNames = [];
        this.attrs = [];
        this.notSelectors = [];
    }
    static parse(selector) {
        var results = [];
        var _addResult = (res, cssSel) => {
            if (cssSel.notSelectors.length > 0 && isBlank(cssSel.element) &&
                ListWrapper.isEmpty(cssSel.classNames) && ListWrapper.isEmpty(cssSel.attrs)) {
                cssSel.element = "*";
            }
            res.push(cssSel);
        };
        var cssSelector = new CssSelector();
        var matcher = RegExpWrapper.matcher(_SELECTOR_REGEXP, selector);
        var match;
        var current = cssSelector;
        var inNot = false;
        while (isPresent(match = RegExpMatcherWrapper.next(matcher))) {
            if (isPresent(match[1])) {
                if (inNot) {
                    throw new BaseException('Nesting :not is not allowed in a selector');
                }
                inNot = true;
                current = new CssSelector();
                cssSelector.notSelectors.push(current);
            }
            if (isPresent(match[2])) {
                current.setElement(match[2]);
            }
            if (isPresent(match[3])) {
                current.addClassName(match[3]);
            }
            if (isPresent(match[4])) {
                current.addAttribute(match[4], match[5]);
            }
            if (isPresent(match[6])) {
                inNot = false;
                current = cssSelector;
            }
            if (isPresent(match[7])) {
                if (inNot) {
                    throw new BaseException('Multiple selectors in :not are not supported');
                }
                _addResult(results, cssSelector);
                cssSelector = current = new CssSelector();
            }
        }
        _addResult(results, cssSelector);
        return results;
    }
    isElementSelector() {
        return isPresent(this.element) && ListWrapper.isEmpty(this.classNames) &&
            ListWrapper.isEmpty(this.attrs) && this.notSelectors.length === 0;
    }
    setElement(element = null) { this.element = element; }
    /** Gets a template string for an element that matches the selector. */
    getMatchingElementTemplate() {
        let tagName = isPresent(this.element) ? this.element : 'div';
        let classAttr = this.classNames.length > 0 ? ` class="${this.classNames.join(' ')}"` : '';
        let attrs = '';
        for (let i = 0; i < this.attrs.length; i += 2) {
            let attrName = this.attrs[i];
            let attrValue = this.attrs[i + 1] !== '' ? `="${this.attrs[i + 1]}"` : '';
            attrs += ` ${attrName}${attrValue}`;
        }
        return `<${tagName}${classAttr}${attrs}></${tagName}>`;
    }
    addAttribute(name, value = _EMPTY_ATTR_VALUE) {
        this.attrs.push(name);
        if (isPresent(value)) {
            value = value.toLowerCase();
        }
        else {
            value = _EMPTY_ATTR_VALUE;
        }
        this.attrs.push(value);
    }
    addClassName(name) { this.classNames.push(name.toLowerCase()); }
    toString() {
        var res = '';
        if (isPresent(this.element)) {
            res += this.element;
        }
        if (isPresent(this.classNames)) {
            for (var i = 0; i < this.classNames.length; i++) {
                res += '.' + this.classNames[i];
            }
        }
        if (isPresent(this.attrs)) {
            for (var i = 0; i < this.attrs.length;) {
                var attrName = this.attrs[i++];
                var attrValue = this.attrs[i++];
                res += '[' + attrName;
                if (attrValue.length > 0) {
                    res += '=' + attrValue;
                }
                res += ']';
            }
        }
        this.notSelectors.forEach(notSelector => res += `:not(${notSelector})`);
        return res;
    }
}
/**
 * Reads a list of CssSelectors and allows to calculate which ones
 * are contained in a given CssSelector.
 */
export class SelectorMatcher {
    constructor() {
        this._elementMap = new Map();
        this._elementPartialMap = new Map();
        this._classMap = new Map();
        this._classPartialMap = new Map();
        this._attrValueMap = new Map();
        this._attrValuePartialMap = new Map();
        this._listContexts = [];
    }
    static createNotMatcher(notSelectors) {
        var notMatcher = new SelectorMatcher();
        notMatcher.addSelectables(notSelectors, null);
        return notMatcher;
    }
    addSelectables(cssSelectors, callbackCtxt) {
        var listContext = null;
        if (cssSelectors.length > 1) {
            listContext = new SelectorListContext(cssSelectors);
            this._listContexts.push(listContext);
        }
        for (var i = 0; i < cssSelectors.length; i++) {
            this._addSelectable(cssSelectors[i], callbackCtxt, listContext);
        }
    }
    /**
     * Add an object that can be found later on by calling `match`.
     * @param cssSelector A css selector
     * @param callbackCtxt An opaque object that will be given to the callback of the `match` function
     */
    _addSelectable(cssSelector, callbackCtxt, listContext) {
        var matcher = this;
        var element = cssSelector.element;
        var classNames = cssSelector.classNames;
        var attrs = cssSelector.attrs;
        var selectable = new SelectorContext(cssSelector, callbackCtxt, listContext);
        if (isPresent(element)) {
            var isTerminal = attrs.length === 0 && classNames.length === 0;
            if (isTerminal) {
                this._addTerminal(matcher._elementMap, element, selectable);
            }
            else {
                matcher = this._addPartial(matcher._elementPartialMap, element);
            }
        }
        if (isPresent(classNames)) {
            for (var index = 0; index < classNames.length; index++) {
                var isTerminal = attrs.length === 0 && index === classNames.length - 1;
                var className = classNames[index];
                if (isTerminal) {
                    this._addTerminal(matcher._classMap, className, selectable);
                }
                else {
                    matcher = this._addPartial(matcher._classPartialMap, className);
                }
            }
        }
        if (isPresent(attrs)) {
            for (var index = 0; index < attrs.length;) {
                var isTerminal = index === attrs.length - 2;
                var attrName = attrs[index++];
                var attrValue = attrs[index++];
                if (isTerminal) {
                    var terminalMap = matcher._attrValueMap;
                    var terminalValuesMap = terminalMap.get(attrName);
                    if (isBlank(terminalValuesMap)) {
                        terminalValuesMap = new Map();
                        terminalMap.set(attrName, terminalValuesMap);
                    }
                    this._addTerminal(terminalValuesMap, attrValue, selectable);
                }
                else {
                    var parttialMap = matcher._attrValuePartialMap;
                    var partialValuesMap = parttialMap.get(attrName);
                    if (isBlank(partialValuesMap)) {
                        partialValuesMap = new Map();
                        parttialMap.set(attrName, partialValuesMap);
                    }
                    matcher = this._addPartial(partialValuesMap, attrValue);
                }
            }
        }
    }
    _addTerminal(map, name, selectable) {
        var terminalList = map.get(name);
        if (isBlank(terminalList)) {
            terminalList = [];
            map.set(name, terminalList);
        }
        terminalList.push(selectable);
    }
    _addPartial(map, name) {
        var matcher = map.get(name);
        if (isBlank(matcher)) {
            matcher = new SelectorMatcher();
            map.set(name, matcher);
        }
        return matcher;
    }
    /**
     * Find the objects that have been added via `addSelectable`
     * whose css selector is contained in the given css selector.
     * @param cssSelector A css selector
     * @param matchedCallback This callback will be called with the object handed into `addSelectable`
     * @return boolean true if a match was found
    */
    match(cssSelector, matchedCallback) {
        var result = false;
        var element = cssSelector.element;
        var classNames = cssSelector.classNames;
        var attrs = cssSelector.attrs;
        for (var i = 0; i < this._listContexts.length; i++) {
            this._listContexts[i].alreadyMatched = false;
        }
        result = this._matchTerminal(this._elementMap, element, cssSelector, matchedCallback) || result;
        result = this._matchPartial(this._elementPartialMap, element, cssSelector, matchedCallback) ||
            result;
        if (isPresent(classNames)) {
            for (var index = 0; index < classNames.length; index++) {
                var className = classNames[index];
                result =
                    this._matchTerminal(this._classMap, className, cssSelector, matchedCallback) || result;
                result =
                    this._matchPartial(this._classPartialMap, className, cssSelector, matchedCallback) ||
                        result;
            }
        }
        if (isPresent(attrs)) {
            for (var index = 0; index < attrs.length;) {
                var attrName = attrs[index++];
                var attrValue = attrs[index++];
                var terminalValuesMap = this._attrValueMap.get(attrName);
                if (!StringWrapper.equals(attrValue, _EMPTY_ATTR_VALUE)) {
                    result = this._matchTerminal(terminalValuesMap, _EMPTY_ATTR_VALUE, cssSelector, matchedCallback) ||
                        result;
                }
                result = this._matchTerminal(terminalValuesMap, attrValue, cssSelector, matchedCallback) ||
                    result;
                var partialValuesMap = this._attrValuePartialMap.get(attrName);
                if (!StringWrapper.equals(attrValue, _EMPTY_ATTR_VALUE)) {
                    result = this._matchPartial(partialValuesMap, _EMPTY_ATTR_VALUE, cssSelector, matchedCallback) ||
                        result;
                }
                result =
                    this._matchPartial(partialValuesMap, attrValue, cssSelector, matchedCallback) || result;
            }
        }
        return result;
    }
    /** @internal */
    _matchTerminal(map, name, cssSelector, matchedCallback) {
        if (isBlank(map) || isBlank(name)) {
            return false;
        }
        var selectables = map.get(name);
        var starSelectables = map.get("*");
        if (isPresent(starSelectables)) {
            selectables = selectables.concat(starSelectables);
        }
        if (isBlank(selectables)) {
            return false;
        }
        var selectable;
        var result = false;
        for (var index = 0; index < selectables.length; index++) {
            selectable = selectables[index];
            result = selectable.finalize(cssSelector, matchedCallback) || result;
        }
        return result;
    }
    /** @internal */
    _matchPartial(map, name, cssSelector, matchedCallback /*: (c: CssSelector, a: any) => void*/) {
        if (isBlank(map) || isBlank(name)) {
            return false;
        }
        var nestedSelector = map.get(name);
        if (isBlank(nestedSelector)) {
            return false;
        }
        // TODO(perf): get rid of recursion and measure again
        // TODO(perf): don't pass the whole selector into the recursion,
        // but only the not processed parts
        return nestedSelector.match(cssSelector, matchedCallback);
    }
}
export class SelectorListContext {
    constructor(selectors) {
        this.selectors = selectors;
        this.alreadyMatched = false;
    }
}
// Store context to pass back selector and context when a selector is matched
export class SelectorContext {
    constructor(selector, cbContext, listContext) {
        this.selector = selector;
        this.cbContext = cbContext;
        this.listContext = listContext;
        this.notSelectors = selector.notSelectors;
    }
    finalize(cssSelector, callback) {
        var result = true;
        if (this.notSelectors.length > 0 &&
            (isBlank(this.listContext) || !this.listContext.alreadyMatched)) {
            var notMatcher = SelectorMatcher.createNotMatcher(this.notSelectors);
            result = !notMatcher.match(cssSelector, null);
        }
        if (result && isPresent(callback) &&
            (isBlank(this.listContext) || !this.listContext.alreadyMatched)) {
            if (isPresent(this.listContext)) {
                this.listContext.alreadyMatched = true;
            }
            callback(this.selector, this.cbContext);
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkaWZmaW5nX3BsdWdpbl93cmFwcGVyLW91dHB1dF9wYXRoLXZoeWtzeFNoLnRtcC9hbmd1bGFyMi9zcmMvY29tcGlsZXIvc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBQyxHQUFHLEVBQUUsV0FBVyxFQUFhLE1BQU0sZ0NBQWdDO09BQ3BFLEVBQ0wsU0FBUyxFQUNULE9BQU8sRUFDUCxhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLGFBQWEsRUFDZCxNQUFNLDBCQUEwQjtPQUMxQixFQUFDLGFBQWEsRUFBbUIsTUFBTSxnQ0FBZ0M7QUFFOUUsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUM7QUFFN0Isa0NBQWtDO0FBQ2xDLHFEQUFxRDtBQUNyRCxJQUFJLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQ3ZDLGNBQWM7SUFDZCxZQUFZO0lBQ1osbUJBQW1CO0lBQ25CLHNDQUFzQztJQUN0QyxRQUFRO0lBQ1IsYUFBYSxDQUFDLENBQUMsQ0FBMkIsTUFBTTtBQUVwRDs7OztHQUlHO0FBQ0g7SUFBQTtRQUNFLFlBQU8sR0FBVyxJQUFJLENBQUM7UUFDdkIsZUFBVSxHQUFhLEVBQUUsQ0FBQztRQUMxQixVQUFLLEdBQWEsRUFBRSxDQUFDO1FBQ3JCLGlCQUFZLEdBQWtCLEVBQUUsQ0FBQztJQTRHbkMsQ0FBQztJQTFHQyxPQUFPLEtBQUssQ0FBQyxRQUFnQjtRQUMzQixJQUFJLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2hDLElBQUksVUFBVSxHQUFHLENBQUMsR0FBa0IsRUFBRSxNQUFNO1lBQzFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztnQkFDekQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksV0FBVyxDQUFD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Q0FBQztRQUNoRCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUM7WUFDN0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztZQUN6QyxDQUFDO1lBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2hCLENBQUM7QUFDSCxDQUFDO0FBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge01hcCwgTGlzdFdyYXBwZXIsIE1hcFdyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvY29sbGVjdGlvbic7XG5pbXBvcnQge1xuICBpc1ByZXNlbnQsXG4gIGlzQmxhbmssXG4gIFJlZ0V4cFdyYXBwZXIsXG4gIFJlZ0V4cE1hdGNoZXJXcmFwcGVyLFxuICBTdHJpbmdXcmFwcGVyXG59IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb24sIFdyYXBwZWRFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5cbmNvbnN0IF9FTVBUWV9BVFRSX1ZBTFVFID0gJyc7XG5cbi8vIFRPRE86IENhbid0IHVzZSBgY29uc3RgIGhlcmUgYXNcbi8vIGluIERhcnQgdGhpcyBpcyBub3QgdHJhbnNwaWxlZCBpbnRvIGBmaW5hbGAgeWV0Li4uXG52YXIgX1NFTEVDVE9SX1JFR0VYUCA9IFJlZ0V4cFdyYXBwZXIuY3JlYXRlKFxuICAgICcoXFxcXDpub3RcXFxcKCl8JyArICAgICAgICAgICAgICAgICAgICAgICAgICAvL1wiOm5vdChcIlxuICAgICcoWy1cXFxcd10rKXwnICsgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJ0YWdcIlxuICAgICcoPzpcXFxcLihbLVxcXFx3XSspKXwnICsgICAgICAgICAgICAgICAgICAgICAvLyBcIi5jbGFzc1wiXG4gICAgJyg/OlxcXFxbKFstXFxcXHcqXSspKD86PShbXlxcXFxdXSopKT9cXFxcXSl8JyArICAvLyBcIltuYW1lXVwiLCBcIltuYW1lPXZhbHVlXVwiIG9yIFwiW25hbWUqPXZhbHVlXVwiXG4gICAgJyhcXFxcKSl8JyArICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcIilcIlxuICAgICcoXFxcXHMqLFxcXFxzKiknKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcIixcIlxuXG4vKipcbiAqIEEgY3NzIHNlbGVjdG9yIGNvbnRhaW5zIGFuIGVsZW1lbnQgbmFtZSxcbiAqIGNzcyBjbGFzc2VzIGFuZCBhdHRyaWJ1dGUvdmFsdWUgcGFpcnMgd2l0aCB0aGUgcHVycG9zZVxuICogb2Ygc2VsZWN0aW5nIHN1YnNldHMgb3V0IG9mIHRoZW0uXG4gKi9cbmV4cG9ydCBjbGFzcyBDc3NTZWxlY3RvciB7XG4gIGVsZW1lbnQ6IHN0cmluZyA9IG51bGw7XG4gIGNsYXNzTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGF0dHJzOiBzdHJpbmdbXSA9IFtdO1xuICBub3RTZWxlY3RvcnM6IENzc1NlbGVjdG9yW10gPSBbXTtcblxuICBzdGF0aWMgcGFyc2Uoc2VsZWN0b3I6IHN0cmluZyk6IENzc1NlbGVjdG9yW10ge1xuICAgIHZhciByZXN1bHRzOiBDc3NTZWxlY3RvcltdID0gW107XG4gICAgdmFyIF9hZGRSZXN1bHQgPSAocmVzOiBDc3NTZWxlY3RvcltdLCBjc3NTZWwpID0+IHtcbiAgICAgIGlmIChjc3NTZWwubm90U2VsZWN0b3JzLmxlbmd0aCA+IDAgJiYgaXNCbGFuayhjc3NTZWwuZWxlbWVudCkgJiZcbiAgICAgICAgICBMaXN0V3JhcHBlci5pc0VtcHR5KGNzc1NlbC5jbGFzc05hbWVzKSAmJiBMaXN0V3JhcHBlci5pc0VtcHR5KGNzc1NlbC5hdHRycykpIHtcbiAgICAgICAgY3NzU2VsLmVsZW1lbnQgPSBcIipcIjtcbiAgICAgIH1cbiAgICAgIHJlcy5wdXNoKGNzc1NlbCk7XG4gICAgfTtcbiAgICB2YXIgY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3IoKTtcbiAgICB2YXIgbWF0Y2hlciA9IFJlZ0V4cFdyYXBwZXIubWF0Y2hlcihfU0VMRUNUT1JfUkVHRVhQLCBzZWxlY3Rvcik7XG4gICAgdmFyIG1hdGNoO1xuICAgIHZhciBjdXJyZW50ID0gY3NzU2VsZWN0b3I7XG4gICAgdmFyIGluTm90ID0gZmFsc2U7XG4gICAgd2hpbGUgKGlzUHJlc2VudChtYXRjaCA9IFJlZ0V4cE1hdGNoZXJXcmFwcGVyLm5leHQobWF0Y2hlcikpKSB7XG4gICAgICBpZiAoaXNQcmVzZW50KG1hdGNoWzFdKSkge1xuICAgICAgICBpZiAoaW5Ob3QpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbignTmVzdGluZyA6bm90IGlzIG5vdCBhbGxvd2VkIGluIGEgc2VsZWN0b3InKTtcbiAgICAgICAgfVxuICAgICAgICBpbk5vdCA9IHRydWU7XG4gICAgICAgIGN1cnJlbnQgPSBuZXcgQ3NzU2VsZWN0b3IoKTtcbiAgICAgICAgY3NzU2VsZWN0b3Iubm90U2VsZWN0b3JzLnB1c2goY3VycmVudCk7XG4gICAgICB9XG4gICAgICBpZiAoaXNQcmVzZW50KG1hdGNoWzJdKSkge1xuICAgICAgICBjdXJyZW50LnNldEVsZW1lbnQobWF0Y2hbMl0pO1xuICAgICAgfVxuICAgICAgaWYgKGlzUHJlc2VudChtYXRjaFszXSkpIHtcbiAgICAgICAgY3VycmVudC5hZGRDbGFzc05hbWUobWF0Y2hbM10pO1xuICAgICAgfVxuICAgICAgaWYgKGlzUHJlc2VudChtYXRjaFs0XSkpIHtcbiAgICAgICAgY3VycmVudC5hZGRBdHRyaWJ1dGUobWF0Y2hbNF0sIG1hdGNoWzVdKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc1ByZXNlbnQobWF0Y2hbNl0pKSB7XG4gICAgICAgIGluTm90ID0gZmFsc2U7XG4gICAgICAgIGN1cnJlbnQgPSBjc3NTZWxlY3RvcjtcbiAgICAgIH1cbiAgICAgIGlmIChpc1ByZXNlbnQobWF0Y2hbN10pKSB7XG4gICAgICAgIGlmIChpbk5vdCkge1xuICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKCdNdWx0aXBsZSBzZWxlY3RvcnMgaW4gOm5vdCBhcmUgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICB9XG4gICAgICAgIF9hZGRSZXN1bHQocmVzdWx0cywgY3NzU2VsZWN0b3IpO1xuICAgICAgICBjc3NTZWxlY3RvciA9IGN1cnJlbnQgPSBuZXcgQ3NzU2VsZWN0b3IoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgX2FkZFJlc3VsdChyZXN1bHRzLCBjc3NTZWxlY3Rvcik7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBpc0VsZW1lbnRTZWxlY3RvcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNQcmVzZW50KHRoaXMuZWxlbWVudCkgJiYgTGlzdFdyYXBwZXIuaXNFbXB0eSh0aGlzLmNsYXNzTmFtZXMpICYmXG4gICAgICAgICAgIExpc3RXcmFwcGVyLmlzRW1wdHkodGhpcy5hdHRycykgJiYgdGhpcy5ub3RTZWxlY3RvcnMubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgc2V0RWxlbWVudChlbGVtZW50OiBzdHJpbmcgPSBudWxsKSB7IHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7IH1cblxuICAvKiogR2V0cyBhIHRlbXBsYXRlIHN0cmluZyBmb3IgYW4gZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLiAqL1xuICBnZXRNYXRjaGluZ0VsZW1lbnRUZW1wbGF0ZSgpOiBzdHJpbmcge1xuICAgIGxldCB0YWdOYW1lID0gaXNQcmVzZW50KHRoaXMuZWxlbWVudCkgPyB0aGlzLmVsZW1lbnQgOiAnZGl2JztcbiAgICBsZXQgY2xhc3NBdHRyID0gdGhpcy5jbGFzc05hbWVzLmxlbmd0aCA+IDAgPyBgIGNsYXNzPVwiJHt0aGlzLmNsYXNzTmFtZXMuam9pbignICcpfVwiYCA6ICcnO1xuXG4gICAgbGV0IGF0dHJzID0gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmF0dHJzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICBsZXQgYXR0ck5hbWUgPSB0aGlzLmF0dHJzW2ldO1xuICAgICAgbGV0IGF0dHJWYWx1ZSA9IHRoaXMuYXR0cnNbaSArIDFdICE9PSAnJyA/IGA9XCIke3RoaXMuYXR0cnNbaSArIDFdfVwiYCA6ICcnO1xuICAgICAgYXR0cnMgKz0gYCAke2F0dHJOYW1lfSR7YXR0clZhbHVlfWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGA8JHt0YWdOYW1lfSR7Y2xhc3NBdHRyfSR7YXR0cnN9PjwvJHt0YWdOYW1lfT5gO1xuICB9XG5cbiAgYWRkQXR0cmlidXRlKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyA9IF9FTVBUWV9BVFRSX1ZBTFVFKSB7XG4gICAgdGhpcy5hdHRycy5wdXNoKG5hbWUpO1xuICAgIGlmIChpc1ByZXNlbnQodmFsdWUpKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gX0VNUFRZX0FUVFJfVkFMVUU7XG4gICAgfVxuICAgIHRoaXMuYXR0cnMucHVzaCh2YWx1ZSk7XG4gIH1cblxuICBhZGRDbGFzc05hbWUobmFtZTogc3RyaW5nKSB7IHRoaXMuY2xhc3NOYW1lcy5wdXNoKG5hbWUudG9Mb3dlckNhc2UoKSk7IH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHZhciByZXMgPSAnJztcbiAgICBpZiAoaXNQcmVzZW50KHRoaXMuZWxlbWVudCkpIHtcbiAgICAgIHJlcyArPSB0aGlzLmVsZW1lbnQ7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQodGhpcy5jbGFzc05hbWVzKSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNsYXNzTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzICs9ICcuJyArIHRoaXMuY2xhc3NOYW1lc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudCh0aGlzLmF0dHJzKSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmF0dHJzLmxlbmd0aDspIHtcbiAgICAgICAgdmFyIGF0dHJOYW1lID0gdGhpcy5hdHRyc1tpKytdO1xuICAgICAgICB2YXIgYXR0clZhbHVlID0gdGhpcy5hdHRyc1tpKytdO1xuICAgICAgICByZXMgKz0gJ1snICsgYXR0ck5hbWU7XG4gICAgICAgIGlmIChhdHRyVmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlcyArPSAnPScgKyBhdHRyVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmVzICs9ICddJztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5ub3RTZWxlY3RvcnMuZm9yRWFjaChub3RTZWxlY3RvciA9PiByZXMgKz0gYDpub3QoJHtub3RTZWxlY3Rvcn0pYCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIGEgbGlzdCBvZiBDc3NTZWxlY3RvcnMgYW5kIGFsbG93cyB0byBjYWxjdWxhdGUgd2hpY2ggb25lc1xuICogYXJlIGNvbnRhaW5lZCBpbiBhIGdpdmVuIENzc1NlbGVjdG9yLlxuICovXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JNYXRjaGVyIHtcbiAgc3RhdGljIGNyZWF0ZU5vdE1hdGNoZXIobm90U2VsZWN0b3JzOiBDc3NTZWxlY3RvcltdKTogU2VsZWN0b3JNYXRjaGVyIHtcbiAgICB2YXIgbm90TWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIoKTtcbiAgICBub3RNYXRjaGVyLmFkZFNlbGVjdGFibGVzKG5vdFNlbGVjdG9ycywgbnVsbCk7XG4gICAgcmV0dXJuIG5vdE1hdGNoZXI7XG4gIH1cblxuICBwcml2YXRlIF9lbGVtZW50TWFwID0gbmV3IE1hcDxzdHJpbmcsIFNlbGVjdG9yQ29udGV4dFtdPigpO1xuICBwcml2YXRlIF9lbGVtZW50UGFydGlhbE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBTZWxlY3Rvck1hdGNoZXI+KCk7XG4gIHByaXZhdGUgX2NsYXNzTWFwID0gbmV3IE1hcDxzdHJpbmcsIFNlbGVjdG9yQ29udGV4dFtdPigpO1xuICBwcml2YXRlIF9jbGFzc1BhcnRpYWxNYXAgPSBuZXcgTWFwPHN0cmluZywgU2VsZWN0b3JNYXRjaGVyPigpO1xuICBwcml2YXRlIF9hdHRyVmFsdWVNYXAgPSBuZXcgTWFwPHN0cmluZywgTWFwPHN0cmluZywgU2VsZWN0b3JDb250ZXh0W10+PigpO1xuICBwcml2YXRlIF9hdHRyVmFsdWVQYXJ0aWFsTWFwID0gbmV3IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFNlbGVjdG9yTWF0Y2hlcj4+KCk7XG4gIHByaXZhdGUgX2xpc3RDb250ZXh0czogU2VsZWN0b3JMaXN0Q29udGV4dFtdID0gW107XG5cbiAgYWRkU2VsZWN0YWJsZXMoY3NzU2VsZWN0b3JzOiBDc3NTZWxlY3RvcltdLCBjYWxsYmFja0N0eHQ/OiBhbnkpIHtcbiAgICB2YXIgbGlzdENvbnRleHQgPSBudWxsO1xuICAgIGlmIChjc3NTZWxlY3RvcnMubGVuZ3RoID4gMSkge1xuICAgICAgbGlzdENvbnRleHQgPSBuZXcgU2VsZWN0b3JMaXN0Q29udGV4dChjc3NTZWxlY3RvcnMpO1xuICAgICAgdGhpcy5fbGlzdENvbnRleHRzLnB1c2gobGlzdENvbnRleHQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc1NlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5fYWRkU2VsZWN0YWJsZShjc3NTZWxlY3RvcnNbaV0sIGNhbGxiYWNrQ3R4dCwgbGlzdENvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gb2JqZWN0IHRoYXQgY2FuIGJlIGZvdW5kIGxhdGVyIG9uIGJ5IGNhbGxpbmcgYG1hdGNoYC5cbiAgICogQHBhcmFtIGNzc1NlbGVjdG9yIEEgY3NzIHNlbGVjdG9yXG4gICAqIEBwYXJhbSBjYWxsYmFja0N0eHQgQW4gb3BhcXVlIG9iamVjdCB0aGF0IHdpbGwgYmUgZ2l2ZW4gdG8gdGhlIGNhbGxiYWNrIG9mIHRoZSBgbWF0Y2hgIGZ1bmN0aW9uXG4gICAqL1xuICBwcml2YXRlIF9hZGRTZWxlY3RhYmxlKGNzc1NlbGVjdG9yOiBDc3NTZWxlY3RvciwgY2FsbGJhY2tDdHh0OiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgbGlzdENvbnRleHQ6IFNlbGVjdG9yTGlzdENvbnRleHQpIHtcbiAgICB2YXIgbWF0Y2hlcjogU2VsZWN0b3JNYXRjaGVyID0gdGhpcztcbiAgICB2YXIgZWxlbWVudCA9IGNzc1NlbGVjdG9yLmVsZW1lbnQ7XG4gICAgdmFyIGNsYXNzTmFtZXMgPSBjc3NTZWxlY3Rvci5jbGFzc05hbWVzO1xuICAgIHZhciBhdHRycyA9IGNzc1NlbGVjdG9yLmF0dHJzO1xuICAgIHZhciBzZWxlY3RhYmxlID0gbmV3IFNlbGVjdG9yQ29udGV4dChjc3NTZWxlY3RvciwgY2FsbGJhY2tDdHh0LCBsaXN0Q29udGV4dCk7XG5cbiAgICBpZiAoaXNQcmVzZW50KGVsZW1lbnQpKSB7XG4gICAgICB2YXIgaXNUZXJtaW5hbCA9IGF0dHJzLmxlbmd0aCA9PT0gMCAmJiBjbGFzc05hbWVzLmxlbmd0aCA9PT0gMDtcbiAgICAgIGlmIChpc1Rlcm1pbmFsKSB7XG4gICAgICAgIHRoaXMuX2FkZFRlcm1pbmFsKG1hdGNoZXIuX2VsZW1lbnRNYXAsIGVsZW1lbnQsIHNlbGVjdGFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF0Y2hlciA9IHRoaXMuX2FkZFBhcnRpYWwobWF0Y2hlci5fZWxlbWVudFBhcnRpYWxNYXAsIGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc1ByZXNlbnQoY2xhc3NOYW1lcykpIHtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBjbGFzc05hbWVzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICB2YXIgaXNUZXJtaW5hbCA9IGF0dHJzLmxlbmd0aCA9PT0gMCAmJiBpbmRleCA9PT0gY2xhc3NOYW1lcy5sZW5ndGggLSAxO1xuICAgICAgICB2YXIgY2xhc3NOYW1lID0gY2xhc3NOYW1lc1tpbmRleF07XG4gICAgICAgIGlmIChpc1Rlcm1pbmFsKSB7XG4gICAgICAgICAgdGhpcy5fYWRkVGVybWluYWwobWF0Y2hlci5fY2xhc3NNYXAsIGNsYXNzTmFtZSwgc2VsZWN0YWJsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2hlciA9IHRoaXMuX2FkZFBhcnRpYWwobWF0Y2hlci5fY2xhc3NQYXJ0aWFsTWFwLCBjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzUHJlc2VudChhdHRycykpIHtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBhdHRycy5sZW5ndGg7KSB7XG4gICAgICAgIHZhciBpc1Rlcm1pbmFsID0gaW5kZXggPT09IGF0dHJzLmxlbmd0aCAtIDI7XG4gICAgICAgIHZhciBhdHRyTmFtZSA9IGF0dHJzW2luZGV4KytdO1xuICAgICAgICB2YXIgYXR0clZhbHVlID0gYXR0cnNbaW5kZXgrK107XG4gICAgICAgIGlmIChpc1Rlcm1pbmFsKSB7XG4gICAgICAgICAgdmFyIHRlcm1pbmFsTWFwID0gbWF0Y2hlci5fYXR0clZhbHVlTWFwO1xuICAgICAgICAgIHZhciB0ZXJtaW5hbFZhbHVlc01hcCA9IHRlcm1pbmFsTWFwLmdldChhdHRyTmFtZSk7XG4gICAgICAgICAgaWYgKGlzQmxhbmsodGVybWluYWxWYWx1ZXNNYXApKSB7XG4gICAgICAgICAgICB0ZXJtaW5hbFZhbHVlc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBTZWxlY3RvckNvbnRleHRbXT4oKTtcbiAgICAgICAgICAgIHRlcm1pbmFsTWFwLnNldChhdHRyTmFtZSwgdGVybWluYWxWYWx1ZXNNYXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLl9hZGRUZXJtaW5hbCh0ZXJtaW5hbFZhbHVlc01hcCwgYXR0clZhbHVlLCBzZWxlY3RhYmxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgcGFydHRpYWxNYXAgPSBtYXRjaGVyLl9hdHRyVmFsdWVQYXJ0aWFsTWFwO1xuICAgICAgICAgIHZhciBwYXJ0aWFsVmFsdWVzTWFwID0gcGFydHRpYWxNYXAuZ2V0KGF0dHJOYW1lKTtcbiAgICAgICAgICBpZiAoaXNCbGFuayhwYXJ0aWFsVmFsdWVzTWFwKSkge1xuICAgICAgICAgICAgcGFydGlhbFZhbHVlc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBTZWxlY3Rvck1hdGNoZXI+KCk7XG4gICAgICAgICAgICBwYXJ0dGlhbE1hcC5zZXQoYXR0ck5hbWUsIHBhcnRpYWxWYWx1ZXNNYXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtYXRjaGVyID0gdGhpcy5fYWRkUGFydGlhbChwYXJ0aWFsVmFsdWVzTWFwLCBhdHRyVmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfYWRkVGVybWluYWwobWFwOiBNYXA8c3RyaW5nLCBTZWxlY3RvckNvbnRleHRbXT4sIG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0YWJsZTogU2VsZWN0b3JDb250ZXh0KSB7XG4gICAgdmFyIHRlcm1pbmFsTGlzdCA9IG1hcC5nZXQobmFtZSk7XG4gICAgaWYgKGlzQmxhbmsodGVybWluYWxMaXN0KSkge1xuICAgICAgdGVybWluYWxMaXN0ID0gW107XG4gICAgICBtYXAuc2V0KG5hbWUsIHRlcm1pbmFsTGlzdCk7XG4gICAgfVxuICAgIHRlcm1pbmFsTGlzdC5wdXNoKHNlbGVjdGFibGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkUGFydGlhbChtYXA6IE1hcDxzdHJpbmcsIFNlbGVjdG9yTWF0Y2hlcj4sIG5hbWU6IHN0cmluZyk6IFNlbGVjdG9yTWF0Y2hlciB7XG4gICAgdmFyIG1hdGNoZXIgPSBtYXAuZ2V0KG5hbWUpO1xuICAgIGlmIChpc0JsYW5rKG1hdGNoZXIpKSB7XG4gICAgICBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcigpO1xuICAgICAgbWFwLnNldChuYW1lLCBtYXRjaGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoZXI7XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgb2JqZWN0cyB0aGF0IGhhdmUgYmVlbiBhZGRlZCB2aWEgYGFkZFNlbGVjdGFibGVgXG4gICAqIHdob3NlIGNzcyBzZWxlY3RvciBpcyBjb250YWluZWQgaW4gdGhlIGdpdmVuIGNzcyBzZWxlY3Rvci5cbiAgICogQHBhcmFtIGNzc1NlbGVjdG9yIEEgY3NzIHNlbGVjdG9yXG4gICAqIEBwYXJhbSBtYXRjaGVkQ2FsbGJhY2sgVGhpcyBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBvYmplY3QgaGFuZGVkIGludG8gYGFkZFNlbGVjdGFibGVgXG4gICAqIEByZXR1cm4gYm9vbGVhbiB0cnVlIGlmIGEgbWF0Y2ggd2FzIGZvdW5kXG4gICovXG4gIG1hdGNoKGNzc1NlbGVjdG9yOiBDc3NTZWxlY3RvciwgbWF0Y2hlZENhbGxiYWNrOiAoYzogQ3NzU2VsZWN0b3IsIGE6IGFueSkgPT4gdm9pZCk6IGJvb2xlYW4ge1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICB2YXIgZWxlbWVudCA9IGNzc1NlbGVjdG9yLmVsZW1lbnQ7XG4gICAgdmFyIGNsYXNzTmFtZXMgPSBjc3NTZWxlY3Rvci5jbGFzc05hbWVzO1xuICAgIHZhciBhdHRycyA9IGNzc1NlbGVjdG9yLmF0dHJzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9saXN0Q29udGV4dHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2xpc3RDb250ZXh0c1tpXS5hbHJlYWR5TWF0Y2hlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJlc3VsdCA9IHRoaXMuX21hdGNoVGVybWluYWwodGhpcy5fZWxlbWVudE1hcCwgZWxlbWVudCwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHwgcmVzdWx0O1xuICAgIHJlc3VsdCA9IHRoaXMuX21hdGNoUGFydGlhbCh0aGlzLl9lbGVtZW50UGFydGlhbE1hcCwgZWxlbWVudCwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHxcbiAgICAgICAgICAgICByZXN1bHQ7XG5cbiAgICBpZiAoaXNQcmVzZW50KGNsYXNzTmFtZXMpKSB7XG4gICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgY2xhc3NOYW1lcy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IGNsYXNzTmFtZXNbaW5kZXhdO1xuICAgICAgICByZXN1bHQgPVxuICAgICAgICAgICAgdGhpcy5fbWF0Y2hUZXJtaW5hbCh0aGlzLl9jbGFzc01hcCwgY2xhc3NOYW1lLCBjc3NTZWxlY3RvciwgbWF0Y2hlZENhbGxiYWNrKSB8fCByZXN1bHQ7XG4gICAgICAgIHJlc3VsdCA9XG4gICAgICAgICAgICB0aGlzLl9tYXRjaFBhcnRpYWwodGhpcy5fY2xhc3NQYXJ0aWFsTWFwLCBjbGFzc05hbWUsIGNzc1NlbGVjdG9yLCBtYXRjaGVkQ2FsbGJhY2spIHx8XG4gICAgICAgICAgICByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzUHJlc2VudChhdHRycykpIHtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBhdHRycy5sZW5ndGg7KSB7XG4gICAgICAgIHZhciBhdHRyTmFtZSA9IGF0dHJzW2luZGV4KytdO1xuICAgICAgICB2YXIgYXR0clZhbHVlID0gYXR0cnNbaW5kZXgrK107XG5cbiAgICAgICAgdmFyIHRlcm1pbmFsVmFsdWVzTWFwID0gdGhpcy5fYXR0clZhbHVlTWFwLmdldChhdHRyTmFtZSk7XG4gICAgICAgIGlmICghU3RyaW5nV3JhcHBlci5lcXVhbHMoYXR0clZhbHVlLCBfRU1QVFlfQVRUUl9WQUxVRSkpIHtcbiAgICAgICAgICByZXN1bHQgPSB0aGlzLl9tYXRjaFRlcm1pbmFsKHRlcm1pbmFsVmFsdWVzTWFwLCBfRU1QVFlfQVRUUl9WQUxVRSwgY3NzU2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkQ2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgICAgICAgcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX21hdGNoVGVybWluYWwodGVybWluYWxWYWx1ZXNNYXAsIGF0dHJWYWx1ZSwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgICAgcmVzdWx0O1xuXG4gICAgICAgIHZhciBwYXJ0aWFsVmFsdWVzTWFwID0gdGhpcy5fYXR0clZhbHVlUGFydGlhbE1hcC5nZXQoYXR0ck5hbWUpO1xuICAgICAgICBpZiAoIVN0cmluZ1dyYXBwZXIuZXF1YWxzKGF0dHJWYWx1ZSwgX0VNUFRZX0FUVFJfVkFMVUUpKSB7XG4gICAgICAgICAgcmVzdWx0ID0gdGhpcy5fbWF0Y2hQYXJ0aWFsKHBhcnRpYWxWYWx1ZXNNYXAsIF9FTVBUWV9BVFRSX1ZBTFVFLCBjc3NTZWxlY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZENhbGxiYWNrKSB8fFxuICAgICAgICAgICAgICAgICAgIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPVxuICAgICAgICAgICAgdGhpcy5fbWF0Y2hQYXJ0aWFsKHBhcnRpYWxWYWx1ZXNNYXAsIGF0dHJWYWx1ZSwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHwgcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfbWF0Y2hUZXJtaW5hbChtYXA6IE1hcDxzdHJpbmcsIFNlbGVjdG9yQ29udGV4dFtdPiwgbmFtZSwgY3NzU2VsZWN0b3I6IENzc1NlbGVjdG9yLFxuICAgICAgICAgICAgICAgICBtYXRjaGVkQ2FsbGJhY2s6IChjOiBDc3NTZWxlY3RvciwgYTogYW55KSA9PiB2b2lkKTogYm9vbGVhbiB7XG4gICAgaWYgKGlzQmxhbmsobWFwKSB8fCBpc0JsYW5rKG5hbWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIHNlbGVjdGFibGVzID0gbWFwLmdldChuYW1lKTtcbiAgICB2YXIgc3RhclNlbGVjdGFibGVzID0gbWFwLmdldChcIipcIik7XG4gICAgaWYgKGlzUHJlc2VudChzdGFyU2VsZWN0YWJsZXMpKSB7XG4gICAgICBzZWxlY3RhYmxlcyA9IHNlbGVjdGFibGVzLmNvbmNhdChzdGFyU2VsZWN0YWJsZXMpO1xuICAgIH1cbiAgICBpZiAoaXNCbGFuayhzZWxlY3RhYmxlcykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHNlbGVjdGFibGU7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBzZWxlY3RhYmxlcy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHNlbGVjdGFibGUgPSBzZWxlY3RhYmxlc1tpbmRleF07XG4gICAgICByZXN1bHQgPSBzZWxlY3RhYmxlLmZpbmFsaXplKGNzc1NlbGVjdG9yLCBtYXRjaGVkQ2FsbGJhY2spIHx8IHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX21hdGNoUGFydGlhbChtYXA6IE1hcDxzdHJpbmcsIFNlbGVjdG9yTWF0Y2hlcj4sIG5hbWUsIGNzc1NlbGVjdG9yOiBDc3NTZWxlY3RvcixcbiAgICAgICAgICAgICAgICBtYXRjaGVkQ2FsbGJhY2sgLyo6IChjOiBDc3NTZWxlY3RvciwgYTogYW55KSA9PiB2b2lkKi8pOiBib29sZWFuIHtcbiAgICBpZiAoaXNCbGFuayhtYXApIHx8IGlzQmxhbmsobmFtZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIG5lc3RlZFNlbGVjdG9yID0gbWFwLmdldChuYW1lKTtcbiAgICBpZiAoaXNCbGFuayhuZXN0ZWRTZWxlY3RvcikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETyhwZXJmKTogZ2V0IHJpZCBvZiByZWN1cnNpb24gYW5kIG1lYXN1cmUgYWdhaW5cbiAgICAvLyBUT0RPKHBlcmYpOiBkb24ndCBwYXNzIHRoZSB3aG9sZSBzZWxlY3RvciBpbnRvIHRoZSByZWN1cnNpb24sXG4gICAgLy8gYnV0IG9ubHkgdGhlIG5vdCBwcm9jZXNzZWQgcGFydHNcbiAgICByZXR1cm4gbmVzdGVkU2VsZWN0b3IubWF0Y2goY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjayk7XG4gIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JMaXN0Q29udGV4dCB7XG4gIGFscmVhZHlNYXRjaGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHVibGljIHNlbGVjdG9yczogQ3NzU2VsZWN0b3JbXSkge31cbn1cblxuLy8gU3RvcmUgY29udGV4dCB0byBwYXNzIGJhY2sgc2VsZWN0b3IgYW5kIGNvbnRleHQgd2hlbiBhIHNlbGVjdG9yIGlzIG1hdGNoZWRcbmV4cG9ydCBjbGFzcyBTZWxlY3RvckNvbnRleHQge1xuICBub3RTZWxlY3RvcnM6IENzc1NlbGVjdG9yW107XG5cbiAgY29uc3RydWN0b3IocHVibGljIHNlbGVjdG9yOiBDc3NTZWxlY3RvciwgcHVibGljIGNiQ29udGV4dDogYW55LFxuICAgICAgICAgICAgICBwdWJsaWMgbGlzdENvbnRleHQ6IFNlbGVjdG9yTGlzdENvbnRleHQpIHtcbiAgICB0aGlzLm5vdFNlbGVjdG9ycyA9IHNlbGVjdG9yLm5vdFNlbGVjdG9ycztcbiAgfVxuXG4gIGZpbmFsaXplKGNzc1NlbGVjdG9yOiBDc3NTZWxlY3RvciwgY2FsbGJhY2s6IChjOiBDc3NTZWxlY3RvciwgYTogYW55KSA9PiB2b2lkKTogYm9vbGVhbiB7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKHRoaXMubm90U2VsZWN0b3JzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgKGlzQmxhbmsodGhpcy5saXN0Q29udGV4dCkgfHwgIXRoaXMubGlzdENvbnRleHQuYWxyZWFkeU1hdGNoZWQpKSB7XG4gICAgICB2YXIgbm90TWF0Y2hlciA9IFNlbGVjdG9yTWF0Y2hlci5jcmVhdGVOb3RNYXRjaGVyKHRoaXMubm90U2VsZWN0b3JzKTtcbiAgICAgIHJlc3VsdCA9ICFub3RNYXRjaGVyLm1hdGNoKGNzc1NlbGVjdG9yLCBudWxsKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAmJiBpc1ByZXNlbnQoY2FsbGJhY2spICYmXG4gICAgICAgIChpc0JsYW5rKHRoaXMubGlzdENvbnRleHQpIHx8ICF0aGlzLmxpc3RDb250ZXh0LmFscmVhZHlNYXRjaGVkKSkge1xuICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLmxpc3RDb250ZXh0KSkge1xuICAgICAgICB0aGlzLmxpc3RDb250ZXh0LmFscmVhZHlNYXRjaGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHRoaXMuc2VsZWN0b3IsIHRoaXMuY2JDb250ZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuIl19