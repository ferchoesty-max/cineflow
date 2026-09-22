export default function App() {
    return (
        <main className="wrap">
            <p className="text-rose-300">CineFlow - v1 - 🎥</p>
            <section className="panel">
                <h1>Tu historia comienza aqui</h1>
                <p>Peliculas, Series y Trailers</p>
            </section>
            <h2 className="my-6">Nuestro catalogo de practica</h2>
            <div className="grid-media">
                {['Orbita Azul', 'La ultima estacion', 'Codigo Aurora'].map((title) => (
                    <article className="panel" key={title}>
                        <div className="poster">
                            <span className="text-5xl">▶️</span>
                        </div>
                        <h2 className="mt-4 text-lg">
                            {title}    
                        </h2>    
                    </article>
                ))}
            </div>
            <p className="muted">
                Datos inventados para realizar pruebas
            </p>
        </main>
    );
}