import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { BreakpointService, Breakpoint } from '../../core/services/breakpoint.service';

@Directive({
  selector: '[appResponsive]',
  standalone: true
})
export class ResponsiveDirective implements OnInit, OnDestroy {
  @Input() appResponsive: Partial<Record<Breakpoint, string>> = {};
  
  private subscription: any;
  
  constructor(
    private el: ElementRef,
    private breakpointService: BreakpointService
  ) {}
  
  ngOnInit() {
    this.subscription = this.breakpointService.currentBreakpoint$.subscribe(
      (breakpoint) => {
        this.applyResponsiveClass(breakpoint);
      }
    );
  }
  
  private applyResponsiveClass(breakpoint: Breakpoint) {
    // Remover todas las clases responsive previas
    Object.keys(this.appResponsive).forEach(bp => {
      const className = this.appResponsive[bp as Breakpoint];
      if (className) {
        this.el.nativeElement.classList.remove(className);
      }
    });
    
    // Aplicar la clase para el breakpoint actual
    const className = this.appResponsive[breakpoint];
    if (className) {
      this.el.nativeElement.classList.add(className);
    }
  }
  
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}