import { TestBed } from '@angular/core/testing';

import { ProhibitedFoodService } from './prohibited-food.service';

describe('ProhibitedFoodService', () => {
  let service: ProhibitedFoodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProhibitedFoodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
