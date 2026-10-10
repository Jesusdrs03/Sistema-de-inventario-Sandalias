"use client";
import Link from "next/link";
import { LegalPage, Titular, contactLine } from "@/components/legal";

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad y Protección de Datos">
      {(info) => (
        <>
          <p>
            En <b>{info.businessName}</b> (en adelante, “la Empresa”) respetamos la privacidad de nuestros clientes,
            proveedores y trabajadores. Esta política explica qué datos personales tratamos en nuestro sistema de
            inventario y ventas, para qué los usamos y cómo puede ejercer sus derechos, conforme a la Constitución de la
            República Bolivariana de Venezuela (artículos 28 y 60), la Ley sobre Mensajes de Datos y Firmas Electrónicas,
            la Ley Especial contra los Delitos Informáticos y demás normativa aplicable.
          </p>

          <h2>1. Responsable del tratamiento</h2>
          <Titular info={info} />

          <h2>2. Datos que recopilamos</h2>
          <ul>
            <li><b>Clientes:</b> nombre o razón social, cédula de identidad o RIF, teléfono, correo electrónico, dirección, tipo de cliente (detal o mayorista), historial de compras, pagos, saldos y números de referencia de las operaciones.</li>
            <li><b>Proveedores:</b> razón social, RIF, persona de contacto, teléfono, correo, dirección y los insumos que suministran.</li>
            <li><b>Usuarios del sistema (personal de la Empresa):</b> nombre, correo electrónico, rol asignado y registro de las operaciones que realizan (ventas, ajustes de inventario, anulaciones, etc.).</li>
          </ul>
          <p>
            No recopilamos claves bancarias, códigos de seguridad, números completos de tarjetas ni datos sensibles
            (salud, religión, ideología u otros semejantes).
          </p>

          <h2>3. Para qué usamos los datos</h2>
          <ul>
            <li>Registrar ventas, emitir comprobantes y llevar el control de pagos, cuentas por cobrar y cierres de caja.</li>
            <li>Gestionar inventario, producción y compras a proveedores.</li>
            <li>Atender cambios, garantías y reclamos.</li>
            <li>Enviar, cuando el cliente lo solicite, el comprobante o recordatorios de pago por WhatsApp u otros medios.</li>
            <li>Cumplir obligaciones legales, contables y tributarias.</li>
            <li>Proteger la seguridad del sistema y auditar las operaciones realizadas por cada usuario.</li>
          </ul>
          <p>No usamos los datos para publicidad de terceros ni los vendemos o alquilamos.</p>

          <h2>4. Fundamento</h2>
          <p>
            Tratamos los datos con el consentimiento del titular al momento de registrarse o realizar una compra, para
            ejecutar la relación comercial o laboral, y para cumplir las obligaciones que imponen las leyes, en especial
            las tributarias.
          </p>

          <h2>5. Con quién compartimos los datos</h2>
          <ul>
            <li><b>Proveedores tecnológicos</b> que prestan el servicio de alojamiento y base de datos: Google Firebase (autenticación y base de datos) y Vercel (alojamiento web). Actúan por cuenta de la Empresa y bajo sus propias medidas de seguridad.</li>
            <li><b>Autoridades</b> administrativas, tributarias o judiciales, cuando lo exija la ley o una orden competente.</li>
          </ul>

          <h2>6. Transferencia internacional</h2>
          <p>
            Los servidores de nuestros proveedores tecnológicos pueden estar ubicados fuera de Venezuela. Al usar el
            sistema o suministrar sus datos, usted acepta esta transferencia, que se realiza solo para los fines
            descritos y con medidas de seguridad adecuadas.
          </p>

          <h2>7. Conservación</h2>
          <p>
            Conservamos los datos mientras exista la relación comercial o laboral y, después, durante los plazos que
            exige la normativa tributaria y mercantil para la conservación de registros contables. Cumplidos esos
            plazos, los datos se eliminan o anonimizan.
          </p>

          <h2>8. Seguridad</h2>
          <ul>
            <li>Comunicación cifrada (HTTPS) entre el navegador y los servidores.</li>
            <li>Acceso solo con usuario y contraseña, con permisos por rol aplicados también en la base de datos.</li>
            <li>Cierre automático de sesión al cerrar la pestaña, al salir de la página o por inactividad.</li>
            <li>Los datos de identificación de clientes y proveedores no pueden ser alterados una vez registrados; solo se actualizan teléfono y dirección.</li>
            <li>Registro del usuario, la fecha y la hora de cada operación.</li>
          </ul>

          <h2>9. Sus derechos (habeas data)</h2>
          <p>
            De acuerdo con el artículo 28 de la Constitución, usted puede en cualquier momento:
          </p>
          <ul>
            <li><b>Acceder</b> a los datos que tenemos sobre usted y conocer el uso que se les da.</li>
            <li><b>Actualizar o rectificar</b> datos inexactos o desactualizados.</li>
            <li><b>Solicitar la eliminación</b> de sus datos cuando ya no sean necesarios, salvo que debamos conservarlos por obligación legal (por ejemplo, registros de ventas y cobros).</li>
            <li><b>Revocar su consentimiento</b> para usos que no sean necesarios para la relación comercial.</li>
          </ul>
          <p>
            Para ejercer estos derechos comuníquese {contactLine(info)}, indicando su nombre y cédula o RIF. Responderemos
            en un plazo razonable y le podremos solicitar verificar su identidad.
          </p>

          <h2>10. Cookies y almacenamiento local</h2>
          <p>
            El sistema no usa cookies publicitarias ni herramientas de rastreo de terceros. Solo guarda en su navegador
            la información técnica necesaria para mantener la sesión abierta mientras la pestaña esté activa y su
            preferencia de tema (claro u oscuro).
          </p>

          <h2>11. Menores de edad</h2>
          <p>
            El sistema es de uso exclusivo del personal autorizado de la Empresa. Los datos de compras realizadas para
            menores se registran a nombre del representante que realiza la compra.
          </p>

          <h2>12. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política. La versión vigente estará siempre publicada en esta página con su fecha de
            actualización. Consulte también nuestros <Link href="/terminos" className="text-brand-600 underline">Términos y Condiciones</Link>.
          </p>
        </>
      )}
    </LegalPage>
  );
}
