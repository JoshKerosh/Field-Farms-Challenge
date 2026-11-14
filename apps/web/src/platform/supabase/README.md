# Backend administrado

La base usa adaptadores demo inyectados en los loaders del router. No se crea un cliente de Supabase ni se requieren credenciales en esta etapa. `.env.example` reserva la URL y clave pública del proyecto para la siguiente integración.

Los adaptadores reales implementarán las interfaces asíncronas de cada módulo. Autenticación, membresías, permisos por fila, restricciones y transacciones se implementarán en Supabase/PostgreSQL; el selector de vista demo no representa autorización. Una clave secreta o `service_role` nunca pertenece a las variables `VITE_*`.
