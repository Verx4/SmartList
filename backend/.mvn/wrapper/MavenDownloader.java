import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public final class MavenDownloader {
    private MavenDownloader() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException("Uso: MavenDownloader <url> <destino>");
        }

        Path destino = Path.of(args[1]).toAbsolutePath();
        Files.createDirectories(destino.getParent());

        System.out.println("Baixando o Maven somente na primeira execução...");

        try (InputStream entrada = URI.create(args[0]).toURL().openStream()) {
            Files.copy(entrada, destino, StandardCopyOption.REPLACE_EXISTING);
        }
    }
}
