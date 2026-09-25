import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Catalog } from "./Catalog";

function Layout() {
    return (
        <>
        <a href="#contenido" className="skip">
            Saltar al contenido
        </a>
        <header className="wrap border-b border-slate-700">
            <strong className="text-2xl text-rose-300">
                CineFLOW 🎥 
            </strong>
            <nav className="mt-4">
                <Link to="/">Catalogo</Link>
                <Link to="/creditos">Creditos</Link>
            </nav>
        </header>
        <main className="wrap" id="contenido">
            <Routes>
                <Route path="/" element={<Catalog />} />
                <Route 
                    path="/titulo/:type/:id"
                    element={
                        <p>
                            La ficha o tarjeta la vamos a poner despues
                            <Link to="/">Regresar</Link>
                        </p>
                    }
                />
                <Route
                    path="/creditos"
                    element={
                        <section className="panel">
                            <h1>Creditos</h1>
                            <p>CineFLow Proyecto Educativo</p>
                            <div>
                                <p>Fernando Daniel Tolentino Uribe</p>
                                <p>Licenciatura en Ingenieria en Sistemas Computacionales</p>
                                <p>Computo en la Nube</p>
                                <p className="muted">395108</p>
                            </div>
                        </section>
                    }
                />
                <Route 
                    path="*"
                    element={
                        <p>
                            Pagina no encontrada. <Link to="/">Ir al inicio</Link>
                        </p>
                    }
                />
            </Routes>
        </main>
        <footer className="wrap muted">
            CineFloew - Catalogo de Peliculas y Series.
        </footer>
        </>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <Layout />
        </BrowserRouter>
    )
}