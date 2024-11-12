import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamingDemoComponent } from './streaming-demo.component';

describe('StreamingDemoComponent', () => {
  let component: StreamingDemoComponent;
  let fixture: ComponentFixture<StreamingDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamingDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreamingDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
