<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Plan de estudios oficial de Licenciatura en Ingenieria de Sistemas - UMSS
// (websis, plan 411702, gestion 2026). La sigla es el codigo oficial de la
// materia y `nivel` es el semestre (A = 1er semestre ... J = 10mo).
// Ademas se agregan materias propias de Ing. Informatica (plan 134111) y se
// conservan las de otras carreras de la FCyT. Se desactivan (sin borrar) las
// materias de ejemplo de Sistemas/Informatica y las del ciclo basico repetidas
// por carrera, asi los examenes ya programados conservan su materia.
return new class extends Migration
{
    private array $plan = [
        ['A', '1803001', 'Inglés I'],
        ['A', '2006063', 'Física General'],
        ['A', '2008019', 'Álgebra I'],
        ['A', '2008054', 'Cálculo I'],
        ['A', '2010010', 'Introducción a la Programación'],
        ['A', '2010140', 'Metodología de la Investigación y Técnicas de Comunicación'],
        ['B', '2008022', 'Álgebra II'],
        ['B', '2008056', 'Cálculo II'],
        ['B', '2008057', 'Matemática Discreta'],
        ['B', '2010003', 'Elementos de Programación y Estructura de Datos'],
        ['B', '2010013', 'Arquitectura de Computadoras I'],
        ['C', '2008058', 'Ecuaciones Diferenciales'],
        ['C', '2008059', 'Estadística I'],
        ['C', '2008060', 'Cálculo Numérico'],
        ['C', '2010012', 'Métodos, Técnicas y Taller de Programación'],
        ['C', '2010015', 'Base de Datos I'],
        ['C', '2010141', 'Circuitos Electrónicos'],
        ['D', '2008061', 'Estadística II'],
        ['D', '2010016', 'Base de Datos II'],
        ['D', '2010017', 'Taller de Sistemas Operativos'],
        ['D', '2010018', 'Sistemas de Información I'],
        ['D', '2016046', 'Contabilidad Básica'],
        ['D', '2016048', 'Investigación Operativa I'],
        ['E', '1803002', 'Inglés II'],
        ['E', '2010022', 'Sistemas de Información II'],
        ['E', '2010035', 'Aplicación de Sistemas Operativos'],
        ['E', '2010053', 'Taller de Base de Datos'],
        ['E', '2010142', 'Sistemas I'],
        ['E', '2016051', 'Investigación Operativa II'],
        ['E', '2016057', 'Mercadotecnia'],
        ['F', '2010019', 'Simulación de Sistemas'],
        ['F', '2010020', 'Ingeniería de Software'],
        ['F', '2010027', 'Inteligencia Artificial'],
        ['F', '2010047', 'Redes de Computadoras'],
        ['F', '2010143', 'Sistemas II'],
        ['F', '2010144', 'Sistemas Económicos'],
        ['G', '2010024', 'Taller de Ingeniería de Software'],
        ['G', '2010145', 'Gestión de Calidad de Software'],
        ['G', '2010146', 'Redes Avanzadas de Computadoras'],
        ['G', '2010176', 'Programación de Sistemas Paralelos'],
        ['G', '2010186', 'Dinámica de Sistemas'],
        ['G', '2010211', 'Aplicaciones Interactivas para Televisión Digital'],
        ['G', '2014087', 'Electrotecnia Industrial'],
        ['G', '2016092', 'Planificación y Evaluación de Proyectos'],
        ['H', '1803009', 'Inglés III'],
        ['H', '2010102', 'Evaluación y Auditoría de Sistemas'],
        ['H', '2010116', 'Taller de Simulación de Sistemas'],
        ['H', '2010119', 'Metodología y Planificación de Proyecto de Grado'],
        ['H', '2010209', 'Seguridad de Sistemas'],
        ['H', '2010210', 'Informática Forense'],
        ['H', '2016059', 'Gestión Estratégica de Empresas'],
        ['I', '2010032', 'Data Warehouse'],
        ['I', '2010122', 'Proyecto Final'],
        ['I', '2010147', 'Práctica Empresarial'],
        ['I', '2010178', 'Entornos Virtuales de Aprendizaje'],
        ['I', '2010188', 'Servicios Telemáticos'],
        ['I', '2010189', 'Reconocimiento de Voz'],
        ['I', '2010218', 'Ciencia de Datos y Machine Learning'],
        ['I', '2016021', 'Planificación y Control de la Producción I'],
        ['I', '2016023', 'Ingeniería Económica'],
        ['I', '2016027', 'Planificación y Control de la Producción II'],
        ['I', '2016049', 'Costos Industriales'],
        ['I', '2016052', 'Ingeniería de Métodos y Reingeniería'],
        ['J', '2010044', 'Diseño de Compiladores'],
        ['J', '2010192', 'Transmisión IP'],
    ];

    // Materias propias de Ing. Informatica (websis, plan 134111) que no estan
    // en el plan de Sistemas.
    private array $informatica = [
        ['B', '2010200', 'Programación'],
        ['C', '2008140', 'Lógica'],
        ['C', '2010014', 'Arquitectura de Computadoras II'],
        ['C', '2010037', 'Teoría de Grafos'],
        ['C', '2010041', 'Organización y Métodos'],
        ['C', '2010206', 'Métodos y Técnicas de Programación'],
        ['D', '2008029', 'Probabilidad y Estadística'],
        ['D', '2010005', 'Taller de Programación en Bajo Nivel'],
        ['D', '2010038', 'Programación Funcional'],
        ['D', '2010197', 'Algoritmos Avanzados'],
        ['E', '2010040', 'Teoría de Autómatas y Lenguajes Formales'],
        ['E', '2010042', 'Graficación por Computadora'],
        ['E', '2010201', 'Inteligencia Artificial I'],
        ['F', '2010049', 'Estructura y Semántica de Lenguajes de Programación'],
        ['F', '2010202', 'Inteligencia Artificial II'],
        ['F', '2010203', 'Programación Web'],
        ['G', '2010100', 'Arquitectura de Software'],
        ['G', '2010204', 'Interacción Humano Computador'],
        ['G', '2010205', 'Tecnología de Redes Avanzadas'],
        ['H', '2010214', 'Taller de Grado I'],
        ['I', '2010215', 'Taller de Grado II'],
    ];

    public function up(): void
    {
        DB::statement('ALTER TABLE materias ADD COLUMN IF NOT EXISTS nivel VARCHAR(1)');

        DB::statement("INSERT INTO carreras (codigo, nombre) VALUES
            ('SIS', 'Ingenieria en Sistemas'), ('INF', 'Ingenieria Informatica')
            ON CONFLICT (codigo) DO NOTHING");

        $this->cargar($this->plan, 'SIS');
        $this->cargar($this->informatica, 'INF');

        $oficiales = array_merge(array_column($this->plan, 1), array_column($this->informatica, 1));
        $carrerasPlan = DB::table('carreras')->whereIn('codigo', ['SIS', 'INF'])->pluck('id')->all();

        // Nombres del plan sin tildes, para detectar las materias repetidas
        // del ciclo basico (Algebra I, Calculo I...) en las demas carreras.
        $nombresPlan = array_map(fn ($m) => $this->normalizar($m[2]), array_merge($this->plan, $this->informatica));

        DB::table('materias')->whereNotIn('sigla', $oficiales)->get(['id', 'nombre', 'carrera_id'])
            ->each(function ($m) use ($carrerasPlan, $nombresPlan) {
                $desactivar = in_array($m->carrera_id, $carrerasPlan)
                    || in_array($this->normalizar($m->nombre), $nombresPlan, true);
                DB::table('materias')->where('id', $m->id)->update(['activo' => ! $desactivar]);
            });
    }

    private function cargar(array $materias, string $codigoCarrera): void
    {
        $carreraId = DB::table('carreras')->where('codigo', $codigoCarrera)->value('id');

        foreach ($materias as [$nivel, $sigla, $nombre]) {
            DB::statement(
                'INSERT INTO materias (sigla, nombre, carrera_id, nivel, activo)
                 VALUES (?, ?, ?, ?, TRUE)
                 ON CONFLICT (sigla) DO UPDATE
                 SET nombre = EXCLUDED.nombre, carrera_id = EXCLUDED.carrera_id,
                     nivel = EXCLUDED.nivel, activo = TRUE, updated_at = NOW()',
                [$sigla, $nombre, $carreraId, $nivel]
            );
        }
    }

    private function normalizar(string $texto): string
    {
        $texto = mb_strtolower(trim($texto));

        return strtr($texto, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n']);
    }

    public function down(): void
    {
        // Las materias del plan se conservan (pueden tener examenes); solo se
        // vuelve a activar el catalogo anterior.
        DB::table('materias')->update(['activo' => true]);
    }
};
