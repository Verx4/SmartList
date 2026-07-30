package br.com.minhalista.oferta;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OfertaRepository extends JpaRepository<Oferta, UUID> {

    Optional<Oferta> findByImpressaoDigital(String impressaoDigital);

    @Query("""
        select o
        from Oferta o
        join fetch o.unidade u
        where o.ativa = true
          and (o.validaDe is null or o.validaDe <= :hoje)
          and (o.validaAte is null or o.validaAte >= :hoje)
          and (:cidade = '' or lower(u.cidade) = lower(:cidade))
          and (:bairro = '' or lower(u.bairro) = lower(:bairro))
          and (:mercado = '' or lower(u.rede) like lower(concat('%', :mercado, '%')))
          and (:categoria = '' or lower(o.categoria) = lower(:categoria))
          and lower(o.produtoChave) like lower(concat('%', :termo, '%'))
        order by o.precoPromocional asc, o.confiancaIa desc
        """)
    List<Oferta> buscarVigentes(
        @Param("hoje") LocalDate hoje,
        @Param("termo") String termo,
        @Param("cidade") String cidade,
        @Param("bairro") String bairro,
        @Param("mercado") String mercado,
        @Param("categoria") String categoria,
        Pageable pagina
    );

    @Modifying
    @Query("""
        update Oferta o
        set o.ativa = false
        where o.ativa = true
          and o.validaAte is not null
          and o.validaAte < :hoje
        """)
    int desativarVencidas(@Param("hoje") LocalDate hoje);

    long deleteByAtivaFalseAndValidaAteBefore(LocalDate limite);
}
