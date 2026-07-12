"""add created_at to user
 
Revision ID: 4782230854df
Revises: 
Create Date: 2026-07-10 12:34:28.402064
 
"""
from typing import Sequence, Union
 
from alembic import op
import sqlalchemy as sa
 
# revision identifiers, used by Alembic.
revision: str = '4782230854df'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
 
 
def upgrade() -> None:
    op.add_column('users', sa.Column('created_at', sa.DateTime(), nullable=True))
 
 
def downgrade() -> None:
    op.drop_column('users', 'created_at')
