import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./app-rutas";

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
