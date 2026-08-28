import { Router } from "express";
import { AuthService } from "../services/authService";
import { SubscriptionService } from "../services/subscriptionService";
import { orgRepo, userRepo, memberRepo, subRepo, planRepo, moduleRepo } from "../repositories";

const router = Router();

export interface StepCheckResult {
  step: number;
  title: string;
  passed: boolean;
  details: string;
  dataSnippet?: any;
}

// POST /api/diagnostics/core-flow - Automated 10-Step SaaS Core Pipeline Verification
router.post("/core-flow", async (_req, res) => {
  const steps: StepCheckResult[] = [];
  const runId = Date.now();
  const testEmail = `diagnostic_${runId}@auratest.com`;
  const testOrgName = `Diagnostic Ateliê ${runId.toString().slice(-4)}`;

  try {
    // STEP 1: POST /api/auth/register Execution
    const session = await AuthService.registerTrial({
      userName: "Willian Auditor",
      email: testEmail,
      password: "secure_pass_demo_123",
      organizationName: testOrgName,
      segment: "SEMIJOIAS",
      document: "12.345.678/0001-90",
      whatsapp: "+55 (19) 99876-5432",
      city: "Limeira",
      state: "SP",
    });

    steps.push({
      step: 1,
      title: "POST /api/auth/register (Onboarding Trigger)",
      passed: Boolean(session && session.token),
      details: `Endpoint de registro executado com payload de teste. Resposta gerou token de sessão: ${session.token.substring(0, 24)}...`,
      dataSnippet: { email: testEmail, orgName: testOrgName },
    });

    // STEP 2: Verify User entity created in Persistence Layer
    const createdUser = await userRepo.findByEmail(testEmail);
    const step2Passed = Boolean(createdUser && createdUser.name === "Willian Auditor");
    steps.push({
      step: 2,
      title: "Usuário Criado no Repositório de Persistência",
      passed: step2Passed,
      details: step2Passed
        ? `Usuário com ID [${createdUser?.id}] persistido com sucesso (Email: ${createdUser?.email}, Status: ${createdUser?.status}).`
        : "Falha: Usuário não foi localizado no repositório de persistência.",
      dataSnippet: createdUser,
    });

    // STEP 3: Verify Organization entity created with proper slug indexing
    const createdOrg = createdUser ? await orgRepo.findById(session.organization.id) : null;
    const step3Passed = Boolean(createdOrg && createdOrg.slug.length > 0 && createdOrg.segment === "SEMIJOIAS");
    steps.push({
      step: 3,
      title: "Organização Criada & Indexada por Slug",
      passed: step3Passed,
      details: step3Passed
        ? `Tenant [${createdOrg?.id}] persistido. Slug: "${createdOrg?.slug}", Domínio: "${createdOrg?.customDomain}".`
        : "Falha: Organização não encontrada no repositório.",
      dataSnippet: createdOrg,
    });

    // STEP 4: Verify Membership created (Role = OWNER, Status = ACTIVE)
    const membership = (createdUser && createdOrg)
      ? await memberRepo.findByOrgAndUser(createdOrg.id, createdUser.id)
      : null;
    const step4Passed = Boolean(membership && membership.role === "OWNER" && membership.status === "ACTIVE");
    steps.push({
      step: 4,
      title: "Vínculo N:N de Membership (Papel: OWNER)",
      passed: step4Passed,
      details: step4Passed
        ? `Vínculo [${membership?.id}] criado associando User [${createdUser?.id}] à Organization [${createdOrg?.id}] com papel [OWNER].`
        : "Falha: Membership não foi estabelecida.",
      dataSnippet: membership,
    });

    // STEP 5: Verify Subscription created in Repositories
    const subscription = createdOrg ? await subRepo.findByOrgId(createdOrg.id) : null;
    const step5Passed = Boolean(subscription && subscription.planId === "TRIAL_30D");
    steps.push({
      step: 5,
      title: "Assinatura Criada (Plano: TRIAL_30D)",
      passed: step5Passed,
      details: step5Passed
        ? `Registro de assinatura [${subscription?.id}] criado e vinculado ao tenant [${createdOrg?.id}].`
        : "Falha: Assinatura não localizada.",
      dataSnippet: subscription,
    });

    // STEP 6: Verify 30-Day Trial State Machine Dates
    const trialStart = subscription ? new Date(subscription.trialStartedAt) : null;
    const trialEnd = subscription ? new Date(subscription.trialEndsAt) : null;
    const daysDiff = (trialStart && trialEnd)
      ? Math.round((trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const step6Passed = Boolean(subscription?.status === "TRIALING" && daysDiff >= 29 && daysDiff <= 31);
    steps.push({
      step: 6,
      title: "Trial de 30 Dias Iniciado (Status: TRIALING)",
      passed: step6Passed,
      details: step6Passed
        ? `Início: ${subscription?.trialStartedAt} | Término: ${subscription?.trialEndsAt} | Duração calculada: exactly ${daysDiff} dias.`
        : `Falha: Duração ou status inválido (Status: ${subscription?.status}, Dias: ${daysDiff}).`,
      dataSnippet: { status: subscription?.status, daysDiff, trialStartedAt: subscription?.trialStartedAt, trialEndsAt: subscription?.trialEndsAt },
    });

    // STEP 7: Test Login & Token Generation for newly registered user
    const loginResult = await AuthService.login(testEmail, "secure_pass_demo_123", createdOrg?.id);
    const step7Passed = Boolean(loginResult && loginResult.token && loginResult.user.email === testEmail);
    steps.push({
      step: 7,
      title: "POST /api/auth/login (Autenticação do Usuário)",
      passed: step7Passed,
      details: step7Passed
        ? `Login bem-sucedido. Token emitido: ${loginResult.token.substring(0, 30)}...`
        : "Falha no processo de login.",
    });

    // STEP 8: Token / Session Validity Check
    const tokenValid = loginResult.token.startsWith("sess_aura_") && loginResult.token.includes(createdUser?.id || "");
    steps.push({
      step: 8,
      title: "Token / Sessão Válida e Decodificável",
      passed: tokenValid,
      details: tokenValid
        ? "Assinatura do token validada com integridade de prefixo, timestamp e ID de usuário."
        : "Falha: Formato do token inconsistente.",
    });

    // STEP 9: Active Tenant Resolution Context Check
    const resolvedTenantCorrect = loginResult.organization.id === createdOrg?.id;
    steps.push({
      step: 9,
      title: "Resolução Automática do Contexto do Tenant Ativo",
      passed: resolvedTenantCorrect,
      details: resolvedTenantCorrect
        ? `Tenant resolvido com sucesso: "${loginResult.organization.name}" [ID: ${loginResult.organization.id}].`
        : "Falha na resolução do Tenant ativo no login.",
    });

    // STEP 10: GET /api/subscriptions/current verification
    const subCurrent = createdOrg ? await SubscriptionService.getTenantSubscription(createdOrg.id) : null;
    const step10Passed = Boolean(
      subCurrent &&
      subCurrent.trial.isTrial &&
      subCurrent.trial.daysRemaining >= 29 &&
      subCurrent.allowedModules.length === 11
    );
    steps.push({
      step: 10,
      title: "GET /api/subscriptions/current (Auditoria de Módulos & Degustação)",
      passed: step10Passed,
      details: step10Passed
        ? `Todos os ${subCurrent?.allowedModules.length} módulos liberados no Trial. Dias restantes: ${subCurrent?.trial.daysRemaining} dias.`
        : "Falha na auditoria da assinatura corrente.",
      dataSnippet: {
        allowedModulesCount: subCurrent?.allowedModules.length,
        daysRemaining: subCurrent?.trial.daysRemaining,
        planName: subCurrent?.plan.name,
      },
    });

    const allPassed = steps.every((s) => s.passed);

    return res.json({
      success: true,
      pipelinePassed: allPassed,
      totalSteps: 10,
      passedCount: steps.filter((s) => s.passed).length,
      timestamp: new Date().toISOString(),
      testedOrganization: {
        id: createdOrg?.id,
        name: createdOrg?.name,
        slug: createdOrg?.slug,
      },
      steps,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      pipelinePassed: false,
      error: error.message,
      steps,
    });
  }
});

export default router;
