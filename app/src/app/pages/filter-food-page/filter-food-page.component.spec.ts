import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterFoodPageComponent } from './filter-food-page.component';

describe('FilterFoodPageComponent', () => {
  let component: FilterFoodPageComponent;
  let fixture: ComponentFixture<FilterFoodPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterFoodPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterFoodPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
