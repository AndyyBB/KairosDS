<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// 1) Inscripcion de estudiantes a un EXAMEN concreto (antes se inscribia a la materia,
//    por lo que un examen nuevo aparecia con inscritos heredados de otros examenes).
//    Los examenes que ya tenian habilitaciones conservan a esos estudiantes como inscritos.
// 2) Catalogo de asignaturas para todas las carreras de la FCyT (por ejemplo
//    "Introduccion a la Programacion"), que se usa al programar un examen.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE TABLE IF NOT EXISTS inscripciones_examen (
    id BIGSERIAL PRIMARY KEY,
    examen_id BIGINT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    estudiante_id BIGINT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    registrado_por BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inscripciones_examen UNIQUE (examen_id, estudiante_id)
);
CREATE INDEX IF NOT EXISTS idx_inscripciones_examen_estudiante ON inscripciones_examen (estudiante_id);

INSERT INTO inscripciones_examen (examen_id, estudiante_id, registrado_por)
SELECT examen_id, estudiante_id, registrado_por FROM habilitaciones
ON CONFLICT (examen_id, estudiante_id) DO NOTHING;

INSERT INTO materias (sigla, nombre, carrera_id)
SELECT c.codigo || m.sufijo, m.nombre, c.id
FROM carreras c
CROSS JOIN (VALUES
    ('105', 'Calculo II'),
    ('106', 'Fisica II'),
    ('107', 'Ecuaciones Diferenciales'),
    ('108', 'Probabilidad y Estadistica'),
    ('109', 'Metodos Numericos'),
    ('112', 'Introduccion a la Programacion'),
    ('113', 'Ingles Tecnico')
) AS m(sufijo, nombre)
ON CONFLICT (sigla) DO NOTHING;

INSERT INTO materias (sigla, nombre, carrera_id)
SELECT t.sigla, t.nombre, (SELECT id FROM carreras WHERE codigo = t.car) FROM (VALUES
    ('INF221','Arquitectura de Computadoras','INF'),
    ('INF222','Matematica Discreta','INF'),
    ('INF312','Base de Datos II','INF'),
    ('INF321','Analisis y Diseno de Algoritmos','INF'),
    ('INF323','Compiladores','INF'),
    ('INF341','Sistemas de Informacion','INF'),
    ('INF351','Lenguajes Formales','INF'),
    ('INF413','Taller de Ingenieria de Software','INF'),
    ('INF421','Seguridad Informatica','INF'),
    ('INF431','Sistemas Distribuidos','INF'),
    ('INF433','Computacion Grafica','INF'),
    ('INF441','Programacion Web','INF'),
    ('INF442','Desarrollo de Aplicaciones Moviles','INF'),
    ('INF451','Inteligencia de Negocios','INF'),
    ('SIS212','Estructuras de Datos','SIS'),
    ('SIS221','Arquitectura de Computadoras','SIS'),
    ('SIS222','Matematica Discreta','SIS'),
    ('SIS312','Sistemas Operativos','SIS'),
    ('SIS321','Redes de Computadoras','SIS'),
    ('SIS323','Programacion Web','SIS'),
    ('SIS332','Gestion de Proyectos de Software','SIS'),
    ('SIS343','Inteligencia Artificial','SIS'),
    ('SIS412','Seguridad de Sistemas','SIS'),
    ('SIS421','Sistemas Distribuidos','SIS'),
    ('SIS431','Taller de Sistemas','SIS'),
    ('SIS432','Comercio Electronico','SIS'),
    ('ELN211','Circuitos Electricos','ELN'),
    ('ELN221','Electronica de Potencia','ELN'),
    ('ELN310','Microcontroladores','ELN'),
    ('ELN320','Sistemas Digitales','ELN'),
    ('ELN331','Telecomunicaciones I','ELN'),
    ('ELN332','Telecomunicaciones II','ELN'),
    ('ELN340','Control Automatico','ELN'),
    ('ELN350','Instrumentacion Electronica','ELN'),
    ('ELN410','Procesamiento Digital de Senales','ELN'),
    ('ELN420','Redes de Comunicaciones','ELN'),
    ('ELN430','Sistemas Embebidos','ELN'),
    ('ELT212','Electromagnetismo','ELT'),
    ('ELT221','Electronica Basica','ELT'),
    ('ELT310','Sistemas de Potencia I','ELT'),
    ('ELT311','Sistemas de Potencia II','ELT'),
    ('ELT321','Maquinas Electricas II','ELT'),
    ('ELT330','Control Automatico','ELT'),
    ('ELT340','Instalaciones Electricas','ELT'),
    ('ELT410','Proteccion de Sistemas Electricos','ELT'),
    ('ELT420','Energias Renovables','ELT'),
    ('ELM210','Circuitos Electricos','ELM'),
    ('ELM220','Mecanica de Solidos','ELM'),
    ('ELM230','Termodinamica','ELM'),
    ('ELM310','Maquinas Electricas','ELM'),
    ('ELM320','Automatizacion Industrial','ELM'),
    ('ELM330','Mecanismos y Maquinas','ELM'),
    ('ELM340','Neumatica e Hidraulica','ELM'),
    ('ELM410','Mantenimiento Industrial','ELM'),
    ('IND211','Investigacion Operativa II','IND'),
    ('IND220','Procesos de Manufactura','IND'),
    ('IND230','Ingenieria de Metodos','IND'),
    ('IND310','Control de Calidad','IND'),
    ('IND320','Logistica y Cadena de Suministro','IND'),
    ('IND330','Gestion de Operaciones','IND'),
    ('IND340','Simulacion de Sistemas','IND'),
    ('IND410','Evaluacion de Proyectos','IND'),
    ('IND420','Seguridad Industrial','IND'),
    ('MEC211','Termodinamica','MEC'),
    ('MEC220','Estatica','MEC'),
    ('MEC221','Dinamica','MEC'),
    ('MEC230','Resistencia de Materiales','MEC'),
    ('MEC310','Transferencia de Calor','MEC'),
    ('MEC320','Diseno de Elementos de Maquinas','MEC'),
    ('MEC330','Maquinas Termicas','MEC'),
    ('MEC340','Procesos de Fabricacion','MEC'),
    ('MEC410','Vibraciones Mecanicas','MEC'),
    ('CIV305','Hormigon Armado I','CIV'),
    ('CIV315','Mecanica de Suelos','CIV'),
    ('CIV325','Hidraulica','CIV'),
    ('CIV330','Estructuras I','CIV'),
    ('CIV331','Estructuras II','CIV'),
    ('CIV340','Ingenieria Sanitaria','CIV'),
    ('CIV350','Vias de Comunicacion','CIV'),
    ('CIV410','Hormigon Armado II','CIV'),
    ('CIV420','Fundaciones','CIV'),
    ('QUI211','Quimica Inorganica','QUI'),
    ('QUI220','Fisicoquimica','QUI'),
    ('QUI230','Quimica Analitica','QUI'),
    ('QUI310','Operaciones Unitarias I','QUI'),
    ('QUI320','Transferencia de Masa','QUI'),
    ('QUI330','Ingenieria de las Reacciones Quimicas','QUI'),
    ('QUI340','Control de Procesos','QUI'),
    ('QUI410','Diseno de Plantas Quimicas','QUI'),
    ('ALI211','Quimica de Alimentos','ALI'),
    ('ALI220','Bioquimica','ALI'),
    ('ALI230','Operaciones Unitarias en Alimentos','ALI'),
    ('ALI310','Tecnologia de Lacteos','ALI'),
    ('ALI320','Tecnologia de Carnes','ALI'),
    ('ALI330','Control de Calidad de Alimentos','ALI'),
    ('ALI340','Envases y Embalajes','ALI'),
    ('ALI410','Procesos Agroindustriales','ALI')
) AS t(sigla, nombre, car)
ON CONFLICT (sigla) DO NOTHING;
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('inscripciones_examen');
    }
};
