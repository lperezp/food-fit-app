import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListFoodPageComponent } from './list-food-page.component';

describe('ListFoodPageComponent', () => {
  let component: ListFoodPageComponent;
  let fixture: ComponentFixture<ListFoodPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFoodPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListFoodPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
