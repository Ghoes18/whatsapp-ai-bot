import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Edit as EditIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Schedule as ScheduleIcon,
  FitnessCenter as FitnessCenterIcon,
} from "@mui/icons-material";
import { dashboardAPI } from '../services/api';
import type { PendingPlan } from '../services/api';

const PendingPlans: React.FC = () => {
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PendingPlan | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPlans();
  }, []);

  const loadPendingPlans = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getPendingPlans();
      setPendingPlans(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erro ao carregar planos pendentes:", error);
      setPendingPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (plan: PendingPlan) => {
    setSelectedPlan(plan);
    setEditedContent(plan.plan_content);
    setIsEditModalOpen(true);
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedPlan) return;

    try {
      setProcessingPlanId(selectedPlan.id);
      await dashboardAPI.reviewPlan(
        selectedPlan.id,
        status,
        status === "approved" ? editedContent : undefined
      );

      // Atualizar localmente
      setPendingPlans((prev) =>
        prev.filter((plan) => plan.id !== selectedPlan.id)
      );
      setIsEditModalOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error("Erro ao revisar plano:", error);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getplanType = (content: string) => {
    if (
      content.toLowerCase().includes("treino") ||
      content.toLowerCase().includes("exercício")
    ) {
      return { type: "Treino", icon: <FitnessCenterIcon />, color: "#2196F3" };
    }
    if (
      content.toLowerCase().includes("nutricional") ||
      content.toLowerCase().includes("alimentação")
    ) {
      return { type: "Nutrição", icon: <ScheduleIcon />, color: "#4CAF50" };
    }
    return { type: "Plano", icon: <ScheduleIcon />, color: "#FF9800" };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="h6">Carregando planos pendentes...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: "bold" }}>
        Planos Pendentes de Aprovação
      </Typography>

      {!Array.isArray(pendingPlans) || pendingPlans.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            Nenhum plano pendente de aprovação
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Todos os planos gerados pela IA foram revisados.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {pendingPlans.map((plan) => {
            const planInfo = getplanType(plan.plan_content);
            const isProcessing = processingPlanId === plan.id;
            return (
              <Grid item xs={12} md={6} lg={4} key={plan.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Avatar sx={{ bgcolor: planInfo.color, mr: 2 }}>
                        {planInfo.icon}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          {planInfo.type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan.client_phone}
                        </Typography>
                      </Box>
                      <Chip label="Pendente" color="warning" size="small" />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Typography
                      variant="body2"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.5,
                        mb: 2,
                      }}
                    >
                      {plan.plan_content}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Criado em: {formatDate(plan.created_at)}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => openEditModal(plan)}
                      sx={{ mr: 1 }}
                      disabled={isProcessing}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setEditedContent(plan.plan_content);
                        handleReview("approved");
                      }}
                      sx={{ mr: 1 }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processando..." : "Aprovar"}
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => {
                        setSelectedPlan(plan);
                        handleReview("rejected");
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processando..." : "Rejeitar"}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Modal de Edição */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => !processingPlanId && setIsEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <EditIcon />
            <Typography variant="h6">Editar Plano</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Cliente: {selectedPlan?.client_phone}
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            variant="outlined"
            placeholder="Edite o conteúdo do plano..."
            sx={{ mb: 2 }}
            disabled={!!processingPlanId}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsEditModalOpen(false)}
            disabled={!!processingPlanId}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RejectIcon />}
            onClick={() => handleReview("rejected")}
            sx={{ mr: 1 }}
            disabled={!!processingPlanId}
          >
            {processingPlanId ? "Processando..." : "Rejeitar"}
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<ApproveIcon />}
            onClick={() => handleReview("approved")}
            disabled={!!processingPlanId}
          >
            {processingPlanId ? "Processando..." : "Aprovar e Enviar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingPlans;
