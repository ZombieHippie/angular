'use strict';"use strict";
var lang_1 = require('angular2/src/facade/lang');
var lifecycle_hooks_1 = require('angular2/src/core/metadata/lifecycle_hooks');
function hasLifecycleHook(lcInterface, token) {
    if (!(token instanceof lang_1.Type))
        return false;
    var proto = token.prototype;
    switch (lcInterface) {
        case lifecycle_hooks_1.LifecycleHooks.AfterContentInit:
            return !!proto.ngAfterContentInit;
        case lifecycle_hooks_1.LifecycleHooks.AfterContentChecked:
            return !!proto.ngAfterContentChecked;
        case lifecycle_hooks_1.LifecycleHooks.AfterViewInit:
            return !!proto.ngAfterViewInit;
        case lifecycle_hooks_1.LifecycleHooks.AfterViewChecked:
            return !!proto.ngAfterViewChecked;
        case lifecycle_hooks_1.LifecycleHooks.OnChanges:
            return !!proto.ngOnChanges;
        case lifecycle_hooks_1.LifecycleHooks.DoCheck:
            return !!proto.ngDoCheck;
        case lifecycle_hooks_1.LifecycleHooks.OnDestroy:
            return !!proto.ngOnDestroy;
        case lifecycle_hooks_1.LifecycleHooks.OnInit:
            return !!proto.ngOnInit;
        default:
            return false;
    }
}
exports.hasLifecycleHook = hasLifecycleHook;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlX2xpZmVjeWNsZV9yZWZsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkaWZmaW5nX3BsdWdpbl93cmFwcGVyLW91dHB1dF9wYXRoLXp0NjJaNlFDLnRtcC9hbmd1bGFyMi9zcmMvY29tcGlsZXIvZGlyZWN0aXZlX2xpZmVjeWNsZV9yZWZsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFCQUFtQiwwQkFBMEIsQ0FBQyxDQUFBO0FBQzlDLGdDQUE2Qiw0Q0FBNEMsQ0FBQyxDQUFBO0FBRTFFLDBCQUFpQyxXQUEyQixFQUFFLEtBQUs7SUFDakUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssWUFBWSxXQUFJLENBQUMsQ0FBQztRQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFFM0MsSUFBSSxLQUFLLEdBQVMsS0FBTSxDQUFDLFNBQVMsQ0FBQztJQUVuQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLEtBQUssZ0NBQWMsQ0FBQyxnQkFBZ0I7WUFDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUM7UUFDcEMsS0FBSyxnQ0FBYyxDQUFDLG1CQUFtQjtZQUNyQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQztRQUN2QyxLQUFLLGdDQUFjLENBQUMsYUFBYTtZQUMvQixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDakMsS0FBSyxnQ0FBYyxDQUFDLGdCQUFnQjtZQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztRQUNwQyxLQUFLLGdDQUFjLENBQUMsU0FBUztZQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDN0IsS0FBSyxnQ0FBYyxDQUFDLE9BQU87WUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1FBQzNCLEtBQUssZ0NBQWMsQ0FBQyxTQUFTO1lBQzNCLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUM3QixLQUFLLGdDQUFjLENBQUMsTUFBTTtZQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFDMUI7WUFDRSxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDO0FBekJlLHdCQUFnQixtQkF5Qi9CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1R5cGV9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0xpZmVjeWNsZUhvb2tzfSBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9tZXRhZGF0YS9saWZlY3ljbGVfaG9va3MnO1xuXG5leHBvcnQgZnVuY3Rpb24gaGFzTGlmZWN5Y2xlSG9vayhsY0ludGVyZmFjZTogTGlmZWN5Y2xlSG9va3MsIHRva2VuKTogYm9vbGVhbiB7XG4gIGlmICghKHRva2VuIGluc3RhbmNlb2YgVHlwZSkpIHJldHVybiBmYWxzZTtcblxuICB2YXIgcHJvdG8gPSAoPGFueT50b2tlbikucHJvdG90eXBlO1xuXG4gIHN3aXRjaCAobGNJbnRlcmZhY2UpIHtcbiAgICBjYXNlIExpZmVjeWNsZUhvb2tzLkFmdGVyQ29udGVudEluaXQ6XG4gICAgICByZXR1cm4gISFwcm90by5uZ0FmdGVyQ29udGVudEluaXQ7XG4gICAgY2FzZSBMaWZlY3ljbGVIb29rcy5BZnRlckNvbnRlbnRDaGVja2VkOlxuICAgICAgcmV0dXJuICEhcHJvdG8ubmdBZnRlckNvbnRlbnRDaGVja2VkO1xuICAgIGNhc2UgTGlmZWN5Y2xlSG9va3MuQWZ0ZXJWaWV3SW5pdDpcbiAgICAgIHJldHVybiAhIXByb3RvLm5nQWZ0ZXJWaWV3SW5pdDtcbiAgICBjYXNlIExpZmVjeWNsZUhvb2tzLkFmdGVyVmlld0NoZWNrZWQ6XG4gICAgICByZXR1cm4gISFwcm90by5uZ0FmdGVyVmlld0NoZWNrZWQ7XG4gICAgY2FzZSBMaWZlY3ljbGVIb29rcy5PbkNoYW5nZXM6XG4gICAgICByZXR1cm4gISFwcm90by5uZ09uQ2hhbmdlcztcbiAgICBjYXNlIExpZmVjeWNsZUhvb2tzLkRvQ2hlY2s6XG4gICAgICByZXR1cm4gISFwcm90by5uZ0RvQ2hlY2s7XG4gICAgY2FzZSBMaWZlY3ljbGVIb29rcy5PbkRlc3Ryb3k6XG4gICAgICByZXR1cm4gISFwcm90by5uZ09uRGVzdHJveTtcbiAgICBjYXNlIExpZmVjeWNsZUhvb2tzLk9uSW5pdDpcbiAgICAgIHJldHVybiAhIXByb3RvLm5nT25Jbml0O1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==