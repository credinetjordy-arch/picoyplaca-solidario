# LATAM Ecuador

Clon frontend del flujo de reserva de LATAM Ecuador, hecho con Astro y Tailwind CSS.

Incluye inicio, búsqueda de vuelos, ofertas, asientos, tienda, pasajeros y pagos.

## Requisitos

- Node.js 22.12 o superior
- Git

## Cómo correrlo

Copia `.env.example` a `.env` y ajusta los valores. No subas el archivo `.env` a GitHub: ahí van claves privadas.

```cmd
cd "c:\Users\manue\Documents\Latam ecuador"
copy .env.example .env
npm install
npm run dev
```

## Cómo subirlo a GitHub (Git + CMD)

1. Entra a [https://github.com/new](https://github.com/new) con tu cuenta.
2. Nombre del repositorio: `latam-ecuador` (sin espacios).
3. Déjalo **público** o **privado**, según quieras.
4. **No** marques "Add a README", ".gitignore" ni "license". El proyecto ya los tiene.
5. Pulsa **Create repository**.
6. Abre **CMD** y pega esto, cambiando `TU-USUARIO` por tu usuario de GitHub:

```cmd
cd /d "c:\Users\manue\Documents\Latam ecuador"
git add .
git commit -m "Add README and GitHub ignore rules."
git remote add origin https://github.com/TU-USUARIO/latam-ecuador.git
git branch -M main
git push -u origin main
```

Si Git pide usuario y contraseña, el usuario es tu cuenta de GitHub y la contraseña es un **Personal Access Token**, no la clave de la web. Lo creas en GitHub: Settings → Developer settings → Personal access tokens.
