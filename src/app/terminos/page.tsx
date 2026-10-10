"use client";
import Link from "next/link";
import { LegalPage, Titular, contactLine } from "@/components/legal";

export default function TermsPage() {
  return (
    <LegalPage title="Términos y Condiciones">
      {(info) => (
        <>
          <p>
            Estos Términos y Condiciones regulan el uso del sistema de inventario, producción y ventas de{" "}
            <b>{info.businessName}</b> (en adelante, “la Empresa”), así como las condiciones comerciales que se aplican a
            las ventas registradas a través de él. Al acceder al sistema o al realizar una compra, usted declara haber
            leído y aceptado estos términos y nuestra <Link href="/privacidad" className="text-brand-600 underline">Política de Privacidad</Link>.
          </p>

          <h2>1. Identificación del titular</h2>
          <Titular info={info} />

          <h2>2. Objeto del sistema</h2>
          <p>
            El sistema es una herramienta de gestión interna de la Empresa para registrar productos, existencias por
            talla, producción, materia prima, clientes, proveedores, ventas, cobros, gastos y reportes. Su uso está
            reservado al personal autorizado de la Empresa.
          </p>

          <h2>3. Cuentas de usuario y acceso</h2>
          <ul>
            <li>Cada cuenta es personal e intransferible. Las cuentas son creadas por el administrador de la Empresa, que asigna un rol (Administrador, Gerente, Vendedor/Cajero o Almacén/Producción) con permisos limitados a sus funciones.</li>
            <li>El usuario es responsable de mantener la confidencialidad de su contraseña y de todas las operaciones realizadas con su cuenta. Debe notificar de inmediato cualquier uso no autorizado.</li>
            <li>Por seguridad, la sesión se cierra al cerrar la pestaña, al salir de la página y tras un período de inactividad.</li>
            <li>Todas las operaciones quedan registradas con el nombre del usuario que las realizó, la fecha y la hora.</li>
            <li>La Empresa puede suspender o desactivar cualquier cuenta en caso de uso indebido o al terminar la relación laboral.</li>
          </ul>

          <h2>4. Uso permitido</h2>
          <p>Queda prohibido, entre otras conductas:</p>
          <ul>
            <li>Acceder o intentar acceder a módulos, datos o cuentas para los que no se tiene autorización.</li>
            <li>Alterar, eliminar o falsear registros de ventas, inventario, pagos o datos de clientes y proveedores.</li>
            <li>Extraer, copiar o divulgar información de clientes, proveedores o de la Empresa para fines ajenos a la actividad comercial.</li>
            <li>Introducir programas maliciosos o realizar acciones que afecten la disponibilidad o seguridad del sistema.</li>
          </ul>
          <p>
            Estas conductas pueden constituir delitos tipificados en la <b>Ley Especial contra los Delitos Informáticos</b>{" "}
            y darán lugar a las acciones disciplinarias, civiles y penales correspondientes.
          </p>

          <h2>5. Precios, moneda y tasa de cambio</h2>
          <ul>
            <li>Los precios se expresan en dólares de los Estados Unidos (USD) como referencia y su equivalente en bolívares (Bs) se calcula con la <b>tasa de cambio oficial publicada por el Banco Central de Venezuela (BCV)</b> vigente al momento de la operación, de acuerdo con la normativa cambiaria vigente.</li>
            <li>Cada venta registra la tasa utilizada. La tasa se obtiene automáticamente de fuentes que publican la tasa oficial del BCV; si no estuviera disponible, se usará la última tasa registrada o una tasa fijada por la Empresa conforme a la publicación oficial.</li>
            <li>Los pagos en divisas (efectivo en dólares, Zelle o Binance) están sujetos al <b>Impuesto a las Grandes Transacciones Financieras (IGTF)</b> en el porcentaje que establezca la ley, el cual se indica de forma separada en el comprobante.</li>
            <li>Cuando corresponda, el Impuesto al Valor Agregado (IVA) se informa de forma discriminada.</li>
            <li>Los precios pueden variar sin previo aviso, pero se respetará el precio informado al momento de confirmar la compra.</li>
          </ul>

          <h2>6. Medios de pago</h2>
          <p>
            Se aceptan Pago Móvil, transferencia bancaria, punto de venta, efectivo en bolívares, efectivo en divisas,
            Zelle y Binance (USDT), así como combinaciones de ellos. Los pagos electrónicos requieren el número de
            referencia y se consideran recibidos una vez verificados en la cuenta de la Empresa. La Empresa no solicita
            claves, códigos de seguridad ni datos de acceso bancario de sus clientes.
          </p>

          <h2>7. Comprobantes de venta</h2>
          <p>
            El ticket o nota de entrega emitido por este sistema es un <b>documento no fiscal</b> que deja constancia de
            la operación. La factura fiscal se emite por los medios autorizados por el Servicio Nacional Integrado de
            Administración Aduanera y Tributaria (SENIAT), conforme a la normativa tributaria vigente, y puede ser
            solicitada por el cliente al momento de la compra.
          </p>

          <h2>8. Ventas a crédito</h2>
          <p>
            Las ventas a crédito solo se otorgan a clientes registrados y a criterio de la Empresa. El saldo pendiente se
            expresa en dólares y los abonos en bolívares se calculan a la tasa oficial del BCV del día del pago.
          </p>

          <h2>9. Cambios, devoluciones y garantía</h2>
          <ul>
            <li>El cliente tiene derecho a recibir productos en las condiciones ofrecidas y a información veraz sobre ellos, conforme a la <b>Ley Orgánica de Precios Justos</b> y la Constitución de la República Bolivariana de Venezuela (art. 117).</li>
            <li>Los cambios se aceptan presentando la nota de entrega o factura, con el producto sin uso y en su estado original, dentro del plazo indicado en el comprobante.</li>
            <li>Los defectos de fabricación serán atendidos mediante reparación, cambio por un producto igual o equivalente o, si no fuera posible, la devolución del monto pagado.</li>
            <li>No cubre el desgaste normal ni los daños por uso inadecuado.</li>
          </ul>

          <h2>10. Validez de los registros electrónicos</h2>
          <p>
            Los registros, comprobantes y mensajes generados por el sistema tienen la eficacia probatoria que les
            reconoce la <b>Ley sobre Mensajes de Datos y Firmas Electrónicas</b>.
          </p>

          <h2>11. Propiedad intelectual</h2>
          <p>
            El sistema, su diseño, marcas, logotipos e información comercial son propiedad de la Empresa o de sus
            licenciantes. No se permite su reproducción o uso sin autorización.
          </p>

          <h2>12. Limitación de responsabilidad</h2>
          <p>
            La Empresa procura que el sistema funcione de forma continua y segura, pero no garantiza la ausencia de
            interrupciones por causas ajenas a su control (fallas de internet, electricidad o de los proveedores
            tecnológicos). La tasa de cambio se toma de fuentes oficiales y públicas; la Empresa no responde por errores
            de terceros en su publicación, pero corregirá cualquier diferencia que se le notifique.
          </p>

          <h2>13. Modificaciones</h2>
          <p>
            La Empresa puede actualizar estos términos. La versión vigente estará siempre publicada en esta página con su
            fecha de actualización.
          </p>

          <h2>14. Ley aplicable y jurisdicción</h2>
          <p>
            Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia se
            someterá a los tribunales competentes de la circunscripción judicial del domicilio de la Empresa, sin
            perjuicio de los derechos que la ley reconoce a los consumidores.
          </p>

          <h2>15. Contacto</h2>
          <p>Para consultas o reclamos, comuníquese {contactLine(info)}.</p>
        </>
      )}
    </LegalPage>
  );
}
