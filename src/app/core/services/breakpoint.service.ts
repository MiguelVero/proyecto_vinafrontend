import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

@Injectable({ providedIn: 'root' })
export class BreakpointService implements OnDestroy {
  private currentBreakpoint = new BehaviorSubject<Breakpoint>('lg');
  currentBreakpoint$ = this.currentBreakpoint.asObservable();
  
  private destroy$ = new Subject<void>();
  
  private breakpoints = {
    xs: 320,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  };
  
  constructor() {
    this.setupBreakpointListener();
    this.updateBreakpoint();
  }
  
  private setupBreakpointListener() {
    const resize$ = new Subject<void>();
    
    window.addEventListener('resize', () => {
      resize$.next();
    });
    
    resize$.pipe(debounceTime(100)).subscribe(() => {
      this.updateBreakpoint();
    });
  }
  
  private updateBreakpoint() {
    const width = window.innerWidth;
    let breakpoint: Breakpoint = 'lg';
    
    if (width < this.breakpoints.xs) breakpoint = 'xs';
    else if (width < this.breakpoints.sm) breakpoint = 'sm';
    else if (width < this.breakpoints.md) breakpoint = 'md';
    else if (width < this.breakpoints.lg) breakpoint = 'lg';
    else if (width < this.breakpoints.xl) breakpoint = 'xl';
    else breakpoint = 'xxl';
    
    this.currentBreakpoint.next(breakpoint);
  }
  
  isMobile(): boolean {
    const bp = this.currentBreakpoint.value;
    return bp === 'xs' || bp === 'sm' || bp === 'md';
  }
  
  isTablet(): boolean {
    return this.currentBreakpoint.value === 'md';
  }
  
  isDesktop(): boolean {
    const bp = this.currentBreakpoint.value;
    return bp === 'lg' || bp === 'xl' || bp === 'xxl';
  }
  
  getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint.value;
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}