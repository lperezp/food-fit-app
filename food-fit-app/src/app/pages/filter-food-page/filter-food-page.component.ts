import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProhibitedFoodService } from '../../services/prohibited-food/prohibited-food.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-filter-food-page',
  imports: [HeaderComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './filter-food-page.component.html',
  styleUrl: './filter-food-page.component.scss'
})
export class FilterFoodPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private prohibitedFoodService = inject(ProhibitedFoodService);
  private authService = inject(AuthService);
  private router = inject(Router);

  formSearch: FormGroup = this.formBuilder.group({
    ingredient: ['', Validators.required]
  });
  listFood: string[] = [];
  isLoading = false;
  error: string | null = null;

  ngOnInit(): void {
    // Cargar alimentos prohibidos del usuario autenticado
    this.loadUserProhibitedFoods();
  }

  async loadUserProhibitedFoods() {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        const prohibitedFoods = await this.prohibitedFoodService.getProhibitedFoodsByUser(currentUser.uid);
        this.listFood = prohibitedFoods.map(food => food.name);
      }
    } catch (error) {
      console.error('Error al cargar alimentos prohibidos:', error);
      this.error = 'Error al cargar los alimentos prohibidos';
    }
  }

  async addFoodToProhibited() {
    if (!this.formSearch.valid) {
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const ingredientName = this.formSearch.value.ingredient.toLowerCase().trim();

      // Verificar si el alimento ya está en la lista
      if (this.listFood.includes(ingredientName)) {
        throw new Error('Este alimento ya está en tu lista de prohibidos');
      }

      // Agregar el alimento a Firestore
      await this.prohibitedFoodService.addProhibitedFood(currentUser.uid, { name: ingredientName });

      // Actualizar la lista local
      this.listFood.push(ingredientName);

      // Limpiar el formulario
      this.formSearch.reset();

      console.log('Alimento agregado exitosamente');
    } catch (error) {
      console.error('Error al agregar alimento:', error);
      this.error = error instanceof Error ? error.message : 'Error al agregar el alimento';
    } finally {
      this.isLoading = false;
    }
  }

  async removeFoodFromProhibited(foodName: string) {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      await this.prohibitedFoodService.deleteProhibitedFood(currentUser.uid, foodName);

      // Actualizar la lista local
      this.listFood = this.listFood.filter(food => food !== foodName);

      console.log('Alimento eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar alimento:', error);
      this.error = error instanceof Error ? error.message : 'Error al eliminar el alimento';
    }
  }
}
