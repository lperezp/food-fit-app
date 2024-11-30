import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailFoodPageComponent } from './detail-food-page.component';

describe('DetailFoodPageComponent', () => {
  let component: DetailFoodPageComponent;
  let fixture: ComponentFixture<DetailFoodPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailFoodPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailFoodPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
