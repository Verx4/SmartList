package br.com.minhalista.oferta;

public final class Distancias {

    private static final double RAIO_TERRA_KM = 6371.0088;

    private Distancias() {
    }

    public static double emQuilometros(
        double latitudeOrigem,
        double longitudeOrigem,
        double latitudeDestino,
        double longitudeDestino
    ) {
        double latitude1 = Math.toRadians(latitudeOrigem);
        double latitude2 = Math.toRadians(latitudeDestino);
        double diferencaLatitude = Math.toRadians(latitudeDestino - latitudeOrigem);
        double diferencaLongitude = Math.toRadians(longitudeDestino - longitudeOrigem);

        double a = Math.sin(diferencaLatitude / 2) * Math.sin(diferencaLatitude / 2)
            + Math.cos(latitude1) * Math.cos(latitude2)
            * Math.sin(diferencaLongitude / 2) * Math.sin(diferencaLongitude / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return RAIO_TERRA_KM * c;
    }
}
