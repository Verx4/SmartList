package br.com.minhalista.pagamento;

import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;

@Service
public class PagamentoPixService {

    private final PagamentoTransacaoService transacaoService;
    private final MercadoPagoService mercadoPagoService;

    public PagamentoPixService(
        PagamentoTransacaoService transacaoService,
        MercadoPagoService mercadoPagoService
    ) {
        this.transacaoService = transacaoService;
        this.mercadoPagoService = mercadoPagoService;
    }

    public PixPagamentoResponse criar(Usuario usuario, String planId, String cpf) {
        CicloAssinatura ciclo = CicloAssinatura.porPlanId(planId);

        if (ciclo == null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Plano Premium invÃ¡lido."
            );
        }

        String cpfNormalizado = CpfValidator.normalizar(cpf);

        if (!CpfValidator.valido(cpfNormalizado)) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Informe um CPF vÃ¡lido para gerar o PIX."
            );
        }

        mercadoPagoService.exigirConfiguracao();
        Pagamento pagamento = transacaoService.preparar(usuario.getId(), ciclo);

        if (pagamento.getProviderPaymentId() == null) {
            MercadoPagoPixCriado criado = mercadoPagoService.criarPagamentoPix(
                usuario,
                pagamento,
                cpfNormalizado
            );
            pagamento = transacaoService.vincular(pagamento.getId(), criado);
        }

        return PixPagamentoResponse.de(pagamento);
    }

    public PixPagamentoResponse consultar(Usuario usuario, UUID publicId) {
        Pagamento pagamento = transacaoService.obterDoUsuario(
            publicId,
            usuario.getId()
        );

        if (pagamento.getProviderPaymentId() != null
            && !pagamento.getStatus().terminal()) {
            PagamentoConsultado consultado = mercadoPagoService.consultarPagamento(
                pagamento.getProviderPaymentId()
            );

            if (!mercadoPagoService.ambienteCompativel(consultado)) {
                throw new RegraNegocioException(
                    HttpStatus.CONFLICT,
                    "O pagamento pertence a outro ambiente."
                );
            }

            transacaoService.processarSePix(consultado);
            pagamento = transacaoService.obterDoUsuario(publicId, usuario.getId());
        } else if (!pagamento.getStatus().terminal()) {
            pagamento = transacaoService.expirarSeNecessario(pagamento.getId());
        }

        return PixPagamentoResponse.de(pagamento);
    }

    public Optional<PixPagamentoResponse> pendente(Usuario usuario) {
        return transacaoService.obterPendente(usuario.getId())
            .map(pagamento -> consultar(usuario, pagamento.getPublicId()))
            .filter(resposta -> !StatusPagamento.valueOf(
                resposta.status().toUpperCase()
            ).terminal());
    }

    public boolean processarNotificacao(PagamentoConsultado pagamento) {
        return transacaoService.processarSePix(pagamento);
    }
}

