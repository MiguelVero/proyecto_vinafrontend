import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuarioService } from '../../core/services/usuario.service';
import { PersonaFormComponent } from '../persona-form/persona-form.component';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.css']
})
export class UsuarioFormComponent implements OnInit {
clearForm() {
throw new Error('Method not implemented.');
}
  form: FormGroup;
  isEdit = false;
  isLoading = false;
  personas: any[] = [];

  // Roles: tomar los que están en la BD si no hay endpoint — mantener sincronía con backend
  roles = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Vendedor' },
    { id: 3, nombre: 'Repartidor' },
    { id: 4, nombre: 'Almacenero' }
  ];

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<UsuarioFormComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { user?: any }
  ) {
    this.form = this.fb.group({
      nombre_usuario: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      id_rol: [2, Validators.required],
      id_persona: [null]
    });
  }

// En usuario-form.component.ts - modificar ngOnInit
ngOnInit(): void {
  if (this.data?.user) {
    this.isEdit = true;
    
    // Cargar datos del usuario incluyendo id_persona
    this.form.patchValue({
      nombre_usuario: this.data.user.nombre_usuario,
      email: this.data.user.email,
      id_rol: this.data.user.id_rol || this.data.user.role || 2,
      id_persona: this.data.user.id_persona || null  // ← Asegurar que se cargue la persona
    });
    
    console.log('Usuario a editar:', this.data.user); // Para debug
  }

  // Cargar personas disponibles para asignar
  this.loadPersonasDisponibles();
}

  loadPersonasDisponibles() {
    this.usuarioService.getPersonasDisponibles().subscribe({
      next: (rows) => { this.personas = rows || []; },
      error: (e) => { console.error('Error cargando personas disponibles', e); }
    });
  }

  openCreatePersona() {
    const ref = this.dialog.open(PersonaFormComponent, { width: '520px', maxWidth: '95vw', autoFocus: false });
    ref.afterClosed().subscribe((res: any) => {
      if (res && res.id_persona) {
        // Añadir a la lista local y setear seleccionado
        this.personas = [ ...(this.personas || []), { id_persona: res.id_persona, nombre_completo: res.nombre_completo } ];
        this.form.patchValue({ id_persona: res.id_persona });
      }
    });
  }

 // En usuario-form.component.ts - modificar el método onSubmit
// En usuario-form.component.ts - agregar debug en onSubmit
onSubmit(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.isLoading = true;
  const payload = { ...this.form.value };
  
  console.log('Datos a enviar:', payload); // Debug
  console.log('ID usuario:', this.data?.user?.id_usuario); // Debug
  
  // Si es edición y password está vacío, no enviarlo
  if (this.isEdit && (!payload.password || payload.password.trim() === '')) {
    delete payload.password;
  }

  const req$ = this.isEdit
    ? this.usuarioService.updateUser(this.data.user.id_usuario, payload)
    : this.usuarioService.createUser(payload);

  req$.subscribe({
    next: () => {
      this.isLoading = false;
      this.dialogRef.close(true);
      this.snackBar.open(this.isEdit ? 'Usuario actualizado' : 'Usuario creado', 'Cerrar', { duration: 3000 });
    },
    error: (err) => {
      console.error('Error saving user:', err);
      console.error('Datos enviados:', payload); // Debug adicional
      this.isLoading = false;
      this.snackBar.open(err?.message || 'Error al guardar usuario', 'Cerrar', { duration: 5000 });
    }
  });
}
  onCancel(): void { this.dialogRef.close(false); }
}
